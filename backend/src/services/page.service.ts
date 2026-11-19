import { prisma } from '../prisma/client.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { signCollabTicket } from '../utils/jwt.js';
import { canEditContent } from '../types/roles.js';
import { ActivityService } from './activity.service.js';

export class PageService {
  static async createPage(workspaceId: string, userId: string, data: { title: string; icon?: string; order?: number }) {
    const page = await prisma.page.create({
      data: {
        workspaceId,
        title: data.title,
        icon: data.icon || '📄',
        order: data.order ?? 0,
        createdById: userId,
        lastEditedById: userId,
        collaborationGeneration: 1,
        collaborationDocuments: {
          create: {
            generation: 1,
            snapshot: Buffer.from([]),
          },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await ActivityService.log({
      workspaceId,
      action: 'PAGE_CREATED',
      userId,
      pageId: page.id,
      details: { title: page.title },
    });

    return page;
  }

  static async listWorkspacePages(workspaceId: string) {
    return prisma.page.findMany({
      where: {
        workspaceId,
        isArchived: false,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        createdBy: { select: { id: true, name: true } },
        lastEditedBy: { select: { id: true, name: true } },
        _count: {
          select: {
            comments: { where: { isResolved: false } },
            versions: true,
          },
        },
      },
    });
  }

  static async getPageById(pageId: string) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: { select: { id: true, name: true, email: true, cursorColor: true } },
        lastEditedBy: { select: { id: true, name: true, email: true, cursorColor: true } },
        _count: {
          select: {
            comments: true,
            versions: true,
          },
        },
      },
    });

    if (!page) throw NotFoundError('Page not found');
    return page;
  }

  static async updatePage(pageId: string, userId: string, data: { title?: string; icon?: string; order?: number; isArchived?: boolean }) {
    const page = await prisma.page.update({
      where: { id: pageId },
      data: {
        ...data,
        lastEditedById: userId,
      },
    });

    await ActivityService.log({
      workspaceId: page.workspaceId,
      action: 'PAGE_UPDATED',
      userId,
      pageId: page.id,
      details: data,
    });

    return page;
  }

  static async deletePage(pageId: string, userId: string) {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw NotFoundError('Page not found');

    await prisma.page.delete({ where: { id: pageId } });

    await ActivityService.log({
      workspaceId: page.workspaceId,
      action: 'PAGE_DELETED',
      userId,
      pageId,
      details: { title: page.title },
    });

    return { success: true };
  }

  /**
   * Generates a secure, short-lived collaboration ticket for the WebSocket handshake
   */
  static async createCollaborationTicket(pageId: string, user: { id: string; name: string; email: string; cursorColor: string }) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!page) throw NotFoundError('Page not found');

    const member = page.workspace.members[0];
    if (!member) {
      throw ForbiddenError('User is not a member of this workspace');
    }

    const canEdit = canEditContent(member.role);

    const ticket = signCollabTicket({
      userId: user.id,
      name: user.name,
      email: user.email,
      cursorColor: user.cursorColor,
      workspaceId: page.workspaceId,
      pageId: page.id,
      role: member.role,
      generation: page.collaborationGeneration,
      canEdit,
    });

    return {
      ticket,
      pageId: page.id,
      workspaceId: page.workspaceId,
      generation: page.collaborationGeneration,
      role: member.role,
      canEdit,
      expiresInSeconds: 60,
    };
  }
}
