import { Request, Response, NextFunction } from 'express';
import { PageService } from '../services/page.service.js';
import { CollabManager } from '../collaboration/collabServer.js';
import { getRedisClients } from '../redis/redisClient.js';
import { UnauthorizedError } from '../utils/errors.js';

export class CollaborationController {
  static async getTicket(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const pageId = req.params.pageId;
      const result = await PageService.createCollaborationTicket(pageId, req.user);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const pageId = req.params.pageId;
      const page = req.pageRecord;
      const gen = page?.collaborationGeneration || 1;
      const roomName = CollabManager.getRoomName(pageId, gen);
      const room = CollabManager.getActiveRoom(roomName);
      const { isAvailable, instanceId } = getRedisClients();

      res.json({
        success: true,
        data: {
          pageId,
          generation: gen,
          activeClientsCount: room ? room.clients.size : 0,
          roomLoadedInMemory: !!room,
          redisClusterSync: isAvailable,
          backendInstanceId: instanceId,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMetadata(req: Request, res: Response, next: NextFunction) {
    try {
      const pageId = req.params.pageId;
      const page = req.pageRecord;

      res.json({
        success: true,
        data: {
          pageId,
          title: page?.title,
          generation: page?.collaborationGeneration,
          workspaceId: page?.workspaceId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
