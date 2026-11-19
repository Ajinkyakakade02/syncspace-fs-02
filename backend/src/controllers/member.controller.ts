import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from '../services/workspace.service.js';
import { inviteMemberSchema, updateMemberRoleSchema } from '../validators/workspace.validator.js';
import { UnauthorizedError } from '../utils/errors.js';

export class MemberController {
  static async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await WorkspaceService.getMembers(req.params.id);
      res.json({ success: true, data: members });
    } catch (err) {
      next(err);
    }
  }

  static async invite(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const data = inviteMemberSchema.parse(req.body);
      const invitation = await WorkspaceService.createInvitation(req.params.id, req.user.id, data);
      res.status(201).json({ success: true, data: invitation });
    } catch (err) {
      next(err);
    }
  }

  static async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const { token } = req.params;
      const result = await WorkspaceService.acceptInvitation(token, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const data = updateMemberRoleSchema.parse(req.body);
      const updated = await WorkspaceService.updateMemberRole(
        req.params.id,
        req.params.memberId,
        data.role,
        req.user.id
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const result = await WorkspaceService.removeMember(req.params.id, req.params.memberId, req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
