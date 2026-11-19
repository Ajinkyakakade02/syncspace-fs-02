import * as Y from 'yjs';
import { prisma } from '../prisma/client.js';
import { logger } from '../config/logger.js';

interface PendingUpdateQueue {
  updates: Buffer[];
  timer: NodeJS.Timeout | null;
  compactionTimer: NodeJS.Timeout | null;
}

export class YjsPersistence {
  private static queues = new Map<string, PendingUpdateQueue>();

  private static getKey(pageId: string, generation: number): string {
    return `${pageId}:${generation}`;
  }

  /**
   * Loads saved document state from PostgreSQL into the provided Y.Doc.
   * Restores snapshot bytes followed by any pending CollaborationUpdate entries.
   */
  static async loadDocument(pageId: string, generation: number, doc: Y.Doc): Promise<string> {
    try {
      // Find or create CollaborationDocument
      let collabDoc = await prisma.collaborationDocument.findUnique({
        where: {
          pageId_generation: {
            pageId,
            generation,
          },
        },
        include: {
          updates: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!collabDoc) {
        collabDoc = await prisma.collaborationDocument.create({
          data: {
            pageId,
            generation,
            snapshot: Buffer.from([]),
          },
          include: { updates: true },
        });
      }

      // 1. Apply snapshot if available
      if (collabDoc.snapshot && collabDoc.snapshot.length > 0) {
        Y.applyUpdate(doc, new Uint8Array(collabDoc.snapshot), 'persistence-load');
      }

      // 2. Apply any incremental updates stored in database
      if (collabDoc.updates && collabDoc.updates.length > 0) {
        for (const u of collabDoc.updates) {
          if (u.updateData && u.updateData.length > 0) {
            Y.applyUpdate(doc, new Uint8Array(u.updateData), 'persistence-load');
          }
        }
      }

      logger.debug(
        { pageId, generation, updatesApplied: collabDoc.updates.length },
        'Loaded Yjs document from PostgreSQL'
      );

      return collabDoc.id;
    } catch (err) {
      logger.error({ err, pageId, generation }, 'Error loading Yjs document from database');
      throw err;
    }
  }

  /**
   * Queues an incremental binary Yjs update for debounced writing to PostgreSQL.
   */
  static recordUpdate(pageId: string, generation: number, update: Uint8Array, doc: Y.Doc) {
    const key = this.getKey(pageId, generation);
    let queue = this.queues.get(key);

    if (!queue) {
      queue = {
        updates: [],
        timer: null,
        compactionTimer: null,
      };
      this.queues.set(key, queue);
    }

    queue.updates.push(Buffer.from(update));

    // Debounce flush to database (500ms debounce)
    if (!queue.timer) {
      queue.timer = setTimeout(() => {
        this.flushPendingUpdates(pageId, generation).catch((err) => {
          logger.error({ err, pageId, generation }, 'Failed to flush pending Yjs updates');
        });
      }, 500);
    }

    // Schedule compaction every 10 seconds or when queue grows large
    if (!queue.compactionTimer && (queue.updates.length >= 20 || !queue.compactionTimer)) {
      queue.compactionTimer = setTimeout(() => {
        this.compactDocument(pageId, generation, doc).catch((err) => {
          logger.error({ err, pageId, generation }, 'Failed to compact Yjs document');
        });
      }, 10000);
    }
  }

  /**
   * Persists accumulated updates into CollaborationUpdate table in PostgreSQL
   */
  static async flushPendingUpdates(pageId: string, generation: number) {
    const key = this.getKey(pageId, generation);
    const queue = this.queues.get(key);
    if (!queue || queue.updates.length === 0) return;

    if (queue.timer) {
      clearTimeout(queue.timer);
      queue.timer = null;
    }

    const updatesToSave = [...queue.updates];
    queue.updates = [];

    try {
      const collabDoc = await prisma.collaborationDocument.findUnique({
        where: { pageId_generation: { pageId, generation } },
        select: { id: true },
      });

      if (!collabDoc) {
        logger.warn({ pageId, generation }, 'CollaborationDocument not found while flushing updates');
        return;
      }

      // Merge pending updates into a single composite update for efficient batch insertion
      if (updatesToSave.length === 1) {
        await prisma.collaborationUpdate.create({
          data: {
            documentId: collabDoc.id,
            updateData: updatesToSave[0] as any,
          },
        });
      } else {
        const mergedUpdate = Y.mergeUpdates(updatesToSave.map((b) => new Uint8Array(b)));
        await prisma.collaborationUpdate.create({
          data: {
            documentId: collabDoc.id,
            updateData: Buffer.from(mergedUpdate) as any,
          },
        });
      }

      logger.debug({ pageId, generation, count: updatesToSave.length }, 'Flushed Yjs updates to PostgreSQL');
    } catch (err) {
      // Re-queue on failure so updates are not lost
      queue.updates.unshift(...updatesToSave);
      logger.error({ err, pageId, generation }, 'Failed to write Yjs updates to PostgreSQL');
    }
  }

  /**
   * Compaction: encodes complete state of doc into a unified snapshot,
   * stores snapshot in CollaborationDocument, and removes compacted individual update records.
   */
  static async compactDocument(pageId: string, generation: number, doc: Y.Doc) {
    const key = this.getKey(pageId, generation);
    const queue = this.queues.get(key);
    if (queue?.compactionTimer) {
      clearTimeout(queue.compactionTimer);
      queue.compactionTimer = null;
    }

    // Flush any pending unwritten updates first
    await this.flushPendingUpdates(pageId, generation);

    try {
      const collabDoc = await prisma.collaborationDocument.findUnique({
        where: { pageId_generation: { pageId, generation } },
        select: { id: true },
      });

      if (!collabDoc) return;

      const fullSnapshot = Buffer.from(Y.encodeStateAsUpdate(doc));
      const stateVector = Buffer.from(Y.encodeStateVector(doc));

      await prisma.$transaction([
        prisma.collaborationDocument.update({
          where: { id: collabDoc.id },
          data: {
            snapshot: fullSnapshot as any,
            stateVector: stateVector as any,
            updatedAt: new Date(),
          },
        }),
        prisma.collaborationUpdate.deleteMany({
          where: { documentId: collabDoc.id },
        }),
      ]);

      logger.info({ pageId, generation, bytes: fullSnapshot.length }, 'Compacted Yjs snapshot in PostgreSQL');
    } catch (err) {
      logger.error({ err, pageId, generation }, 'Error during Yjs document compaction');
    }
  }

  /**
   * Flushes and compacts the document on room close or shutdown
   */
  static async flushAndClose(pageId: string, generation: number, doc: Y.Doc) {
    await this.flushPendingUpdates(pageId, generation);
    await this.compactDocument(pageId, generation, doc);
    this.invalidateRoom(pageId, generation);
  }

  /**
   * Cleans up queues and timers when a room is destroyed or generation is bumped
   */
  static invalidateRoom(pageId: string, generation: number) {
    const key = this.getKey(pageId, generation);
    const queue = this.queues.get(key);
    if (queue) {
      if (queue.timer) clearTimeout(queue.timer);
      if (queue.compactionTimer) clearTimeout(queue.compactionTimer);
      this.queues.delete(key);
    }
  }

  /**
   * Retrieves a consolidated merged snapshot Buffer directly from PostgreSQL for a page and generation
   */
  static async getMergedSnapshotForPage(pageId: string, generation: number): Promise<Buffer> {
    const collabDoc = await prisma.collaborationDocument.findUnique({
      where: { pageId_generation: { pageId, generation } },
      include: {
        updates: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!collabDoc) {
      return Buffer.from([]);
    }

    const tempDoc = new Y.Doc();
    if (collabDoc.snapshot && collabDoc.snapshot.length > 0) {
      Y.applyUpdate(tempDoc, new Uint8Array(collabDoc.snapshot), 'snapshot-read');
    }
    for (const u of collabDoc.updates) {
      if (u.updateData && u.updateData.length > 0) {
        Y.applyUpdate(tempDoc, new Uint8Array(u.updateData), 'snapshot-read');
      }
    }

    const merged = Buffer.from(Y.encodeStateAsUpdate(tempDoc));
    tempDoc.destroy();
    return merged;
  }
}
