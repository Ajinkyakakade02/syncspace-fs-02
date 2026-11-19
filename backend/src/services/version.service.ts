import { prisma } from '../prisma/client.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { ActivityService } from './activity.service.js';
import { YjsPersistence } from '../persistence/yjsPersistence.js';

export class VersionService {
  static async createVersion(
    pageId: string,
    userId: string,
    data: { name: string; description?: string }
  ) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) throw NotFoundError('Page not found');

    // Get current durable Yjs snapshot from YjsPersistence
    const snapshotBuffer = await YjsPersistence.getMergedSnapshotForPage(pageId, page.collaborationGeneration);

    const version = await prisma.pageVersion.create({
      data: {
        pageId,
        generation: page.collaborationGeneration,
        name: data.name,
        description: data.description,
        snapshot: new Uint8Array(snapshotBuffer),
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await ActivityService.log({
      workspaceId: page.workspaceId,
      action: 'PAGE_UPDATED',
      userId,
      pageId,
      details: { versionId: version.id, versionName: version.name },
    });

    return {
      id: version.id,
      pageId: version.pageId,
      generation: version.generation,
      name: version.name,
      description: version.description,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
      sizeBytes: version.snapshot.length,
    };
  }

  static async listVersions(pageId: string) {
    const versions = await prisma.pageVersion.findMany({
      where: { pageId },
      include: {
        createdBy: { select: { id: true, name: true, email: true, cursorColor: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      pageId: v.pageId,
      generation: v.generation,
      name: v.name,
      description: v.description,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      sizeBytes: v.snapshot.length,
      restoredFromId: v.restoredFromId,
    }));
  }

  static async getVersionById(pageId: string, versionId: string) {
    const version = await prisma.pageVersion.findUnique({
      where: { id: versionId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!version || version.pageId !== pageId) {
      throw NotFoundError('Version snapshot not found');
    }

    return version;
  }

  /**
   * Safely restores a previous version by:
   * 1. Preserving existing state as an automated snapshot
   * 2. Bumping the collaborationGeneration on the Page
   * 3. Creating a new CollaborationDocument initialized with the target version's snapshot bytes
   * 4. Invalidating/closing the previous generation's room
   * This guarantees clean CRDT state without monotonic merge conflicts!
   */
  static async restoreVersion(pageId: string, versionId: string, userId: string) {
    const versionToRestore = await prisma.pageVersion.findUnique({
      where: { id: versionId },
    });

    if (!versionToRestore || versionToRestore.pageId !== pageId) {
      throw NotFoundError('Version to restore not found');
    }

    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) throw NotFoundError('Page not found');

    // 1. Create an automated snapshot of the state before restoring so work isn't lost
    try {
      const currentSnapshot = await YjsPersistence.getMergedSnapshotForPage(pageId, page.collaborationGeneration);
      if (currentSnapshot.length > 0) {
        await prisma.pageVersion.create({
          data: {
            pageId,
            generation: page.collaborationGeneration,
            name: `Auto-snapshot before restore (Gen ${page.collaborationGeneration})`,
            description: `Automatic backup created prior to restoring version "${versionToRestore.name}"`,
            snapshot: new Uint8Array(currentSnapshot),
            createdById: userId,
          },
        });
      }
    } catch {
      // Continue even if auto-snapshot was empty
    }

    const nextGeneration = page.collaborationGeneration + 1;

    // 2. Transaction: create new CollaborationDocument with restored snapshot & update page generation
    const [updatedPage, newCollabDoc] = await prisma.$transaction([
      prisma.page.update({
        where: { id: pageId },
        data: {
          collaborationGeneration: nextGeneration,
          lastEditedById: userId,
        },
      }),
      prisma.collaborationDocument.create({
        data: {
          pageId,
          generation: nextGeneration,
          snapshot: versionToRestore.snapshot,
        },
      }),
    ]);

    // 3. Record new restored version entry
    await prisma.pageVersion.create({
      data: {
        pageId,
        generation: nextGeneration,
        name: `Restored: ${versionToRestore.name}`,
        description: `Restored by user from version created at ${versionToRestore.createdAt.toISOString()}`,
        snapshot: versionToRestore.snapshot,
        createdById: userId,
        restoredFromId: versionToRestore.id,
      },
    });

    await ActivityService.log({
      workspaceId: page.workspaceId,
      action: 'PAGE_RESTORED',
      userId,
      pageId,
      details: {
        restoredVersionId: versionId,
        previousGeneration: page.collaborationGeneration,
        newGeneration: nextGeneration,
      },
    });

    // Notify persistence layer to invalidate cached room if open
    YjsPersistence.invalidateRoom(pageId, page.collaborationGeneration);

    return {
      success: true,
      pageId: updatedPage.id,
      newGeneration: nextGeneration,
      restoredFrom: versionToRestore.name,
      message: 'Version restored into new collaboration generation successfully',
    };
  }
}
