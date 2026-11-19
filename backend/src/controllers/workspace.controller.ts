import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from '../services/workspace.service.js';
import { createWorkspaceSchema, updateWorkspaceSchema } from '../validators/workspace.validator.js';
import { UnauthorizedError } from '../utils/errors.js';

export class WorkspaceController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const data = createWorkspaceSchema.parse(req.body);
      const workspace = await WorkspaceService.createWorkspace(req.user.id, data);
      res.status(201).json({ success: true, data: workspace });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const workspaces = await WorkspaceService.listUserWorkspaces(req.user.id);
      res.json({ success: true, data: workspaces });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const workspace = await WorkspaceService.getWorkspaceById(req.params.id, req.user.id);
      res.json({ success: true, data: workspace });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const data = updateWorkspaceSchema.parse(req.body);
      const workspace = await WorkspaceService.updateWorkspace(req.params.id, req.user.id, data);
      res.json({ success: true, data: workspace });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const result = await WorkspaceService.deleteWorkspace(req.params.id, req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
