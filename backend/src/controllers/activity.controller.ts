import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/activity.service.js';

export class ActivityController {
  static async getWorkspaceActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.id;
      const logs = await ActivityService.getWorkspaceActivity(workspaceId);
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }

  static async getPageActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const pageId = req.params.pageId;
      const logs = await ActivityService.getPageActivity(pageId);
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
}
