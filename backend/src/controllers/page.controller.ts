import { Request, Response, NextFunction } from 'express';
import { PageService } from '../services/page.service.js';
import { createPageSchema, updatePageSchema } from '../validators/page.validator.js';
import { UnauthorizedError } from '../utils/errors.js';

export class PageController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const workspaceId = req.params.id;
      const data = createPageSchema.parse(req.body);
      const page = await PageService.createPage(workspaceId, req.user.id, data);
      res.status(201).json({ success: true, data: page });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.id;
      const pages = await PageService.listWorkspacePages(workspaceId);
      res.json({ success: true, data: pages });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const pageId = req.params.pageId;
      const page = await PageService.getPageById(pageId);
      res.json({ success: true, data: page });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const pageId = req.params.pageId;
      const data = updatePageSchema.parse(req.body);
      const page = await PageService.updatePage(pageId, req.user.id, data);
      res.json({ success: true, data: page });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const pageId = req.params.pageId;
      const result = await PageService.deletePage(pageId, req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createCollabTicket(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const pageId = req.params.pageId;
      const result = await PageService.createCollaborationTicket(pageId, req.user);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
