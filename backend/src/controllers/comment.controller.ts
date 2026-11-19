import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service.js';
import { createCommentSchema, updateCommentSchema, createReplySchema } from '../validators/comment.validator.js';
import { UnauthorizedError } from '../utils/errors.js';

export class CommentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pageId = req.params.pageId;
      const comments = await CommentService.getComments(pageId);
      res.json({ success: true, data: comments });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const pageId = req.params.pageId;
      const data = createCommentSchema.parse(req.body);
      const comment = await CommentService.createComment(pageId, req.user.id, data);
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const commentId = req.params.commentId;
      const data = updateCommentSchema.parse(req.body);
      const updated = await CommentService.updateComment(commentId, req.user.id, data.content);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const commentId = req.params.commentId;
      const isAdminOrOwner = req.workspaceMember?.role === 'OWNER' || req.workspaceMember?.role === 'ADMIN';
      const result = await CommentService.deleteComment(commentId, req.user.id, isAdminOrOwner);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async toggleResolve(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const commentId = req.params.commentId;
      const updated = await CommentService.toggleResolveComment(commentId, req.user.id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async createReply(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const commentId = req.params.commentId;
      const data = createReplySchema.parse(req.body);
      const reply = await CommentService.createReply(commentId, req.user.id, data.content);
      res.status(201).json({ success: true, data: reply });
    } catch (err) {
      next(err);
    }
  }

  static async deleteReply(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw UnauthorizedError();
      const replyId = req.params.replyId;
      const isAdminOrOwner = req.workspaceMember?.role === 'OWNER' || req.workspaceMember?.role === 'ADMIN';
      const result = await CommentService.deleteReply(replyId, req.user.id, isAdminOrOwner);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
