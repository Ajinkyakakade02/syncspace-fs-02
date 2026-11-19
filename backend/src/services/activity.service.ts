import { ActivityAction, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { logger } from '../config/logger.js';

export class ActivityService {
  static async log(params: {
    workspaceId: string;
    action: ActivityAction;
    userId?: string;
    pageId?: string;
    details?: Prisma.InputJsonValue;
  }) {
    try {
      return await prisma.activityLog.create({
        data: {
          workspaceId: params.workspaceId,
          action: params.action,
          userId: params.userId,
          pageId: params.pageId,
          details: params.details,
        },
      });
    } catch (err) {
      logger.warn({ err, params }, 'Failed to record activity log');
      return null;
    }
  }

  static async getWorkspaceActivity(workspaceId: string, limit = 50) {
    return prisma.activityLog.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, cursorColor: true } },
        page: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getPageActivity(pageId: string, limit = 50) {
    return prisma.activityLog.findMany({
      where: { pageId },
      include: {
        user: { select: { id: true, name: true, email: true, cursorColor: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
