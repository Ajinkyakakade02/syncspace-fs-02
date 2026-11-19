import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { hasMinimumRole } from '../types/roles.js';

declare global {
  namespace Express {
    interface Request {
      workspaceMember?: {
        workspaceId: string;
        userId: string;
        role: Role;
      };
      pageRecord?: {
        id: string;
        workspaceId: string;
        collaborationGeneration: number;
        title: string;
      };
    }
  }
}

/**
 * Checks if the authenticated user has at least the required role in the specified workspace
 */
export const requireWorkspaceRole = (requiredRole: Role) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw UnauthorizedError();
      }

      const workspaceId = req.params.workspaceId || req.params.id;
      if (!workspaceId) {
        throw NotFoundError('Workspace ID missing');
      }

      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: req.user.id,
          },
        },
      });

      if (!member) {
        throw ForbiddenError('You are not a member of this workspace');
      }

      if (!hasMinimumRole(member.role, requiredRole)) {
        throw ForbiddenError(`Requires ${requiredRole} role or higher`);
      }

      req.workspaceMember = {
        workspaceId: member.workspaceId,
        userId: member.userId,
        role: member.role,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Checks if the user can access a page by looking up the page and verifying membership in the owning workspace
 */
export const requirePageAccess = (requiredRole: Role = 'VIEWER') => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw UnauthorizedError();
      }

      const pageId = req.params.pageId || req.params.id;
      if (!pageId) {
        throw NotFoundError('Page ID missing');
      }

      const page = await prisma.page.findUnique({
        where: { id: pageId },
        select: {
          id: true,
          workspaceId: true,
          collaborationGeneration: true,
          title: true,
          isArchived: true,
        },
      });

      if (!page) {
        throw NotFoundError('Page not found');
      }

      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: page.workspaceId,
            userId: req.user.id,
          },
        },
      });

      if (!member) {
        throw ForbiddenError('You do not have access to this page');
      }

      if (!hasMinimumRole(member.role, requiredRole)) {
        throw ForbiddenError(`Requires ${requiredRole} role or higher on this page`);
      }

      req.pageRecord = page;
      req.workspaceMember = {
        workspaceId: member.workspaceId,
        userId: member.userId,
        role: member.role,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
};
