import { Request, Response, NextFunction } from 'express';
import { VersionService } from '../services/version.service.js';
import { createVersionSchema } from '../validators/version.validator.js';
import { UnauthorizedError } from '../utils/errors.js';

export class VersionController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pageId = req.params.pageId;
      const versions = await VersionService.listVersions(pageId);
      res.json({ success: true, data: versions });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { pageId, versionId } = req.params;
      const version = await VersionService.getVersionById(pageId, versionId);
      res.json({
        success: true,
        data: {
          id: version.id,
          pageId: version.pageId,
          generation: version.generation,
          name: version.name,
          description: version.description,
          createdAt: version.createdAt,
          createdBy: version.createdBy,
          sizeBytes: version.snapshot.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const pageId = req.params.pageId;
      const data = createVersionSchema.parse(req.body);
      const version = await VersionService.createVersion(pageId, req.user.id, data);
      res.status(201).json({ success: true, data: version });
    } catch (err) {
      next(err);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const { pageId, versionId } = req.params;
      const result = await VersionService.restoreVersion(pageId, versionId, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
