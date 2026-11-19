import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { ActivityService } from './activity.service.js';

export class CommentService {
  static async getComments(pageId: string) {
    return prisma.comment.findMany({
      where: { pageId },
      include: {
        author: {
          select: { id: true, name: true, email: true, cursorColor: true, avatarUrl: true },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, cursorColor: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createComment(
    pageId: string,
    authorId: string,
    data: { content: string; anchor?: { from?: number; to?: number; quote?: string } }
  ) {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw NotFoundError('Page not found');

    const comment = await prisma.comment.create({
      data: {
        pageId,
        authorId,
        content: data.content,
        anchor: data.anchor as Prisma.InputJsonValue | undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, cursorColor: true, avatarUrl: true },
        },
        replies: true,
      },
    });

    await ActivityService.log({
      workspaceId: page.workspaceId,
      action: 'COMMENT_ADDED',
      userId: authorId,
      pageId,
      details: { commentId: comment.id },
    });

    return comment;
  }

  static async updateComment(commentId: string, userId: string, content: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw NotFoundError('Comment not found');
    if (comment.authorId !== userId) {
      throw ForbiddenError('You can only edit your own comments');
    }

    return prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true, email: true, cursorColor: true, avatarUrl: true },
        },
      },
    });
  }

  static async deleteComment(commentId: string, userId: string, isAdminOrOwner = false) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw NotFoundError('Comment not found');

    if (comment.authorId !== userId && !isAdminOrOwner) {
      throw ForbiddenError('You can only delete your own comments');
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  static async toggleResolveComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { page: true },
    });
    if (!comment) throw NotFoundError('Comment not found');

    const isResolved = !comment.isResolved;

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        isResolved,
        resolvedById: isResolved ? userId : null,
        resolvedAt: isResolved ? new Date() : null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, cursorColor: true, avatarUrl: true },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (isResolved) {
      await ActivityService.log({
        workspaceId: comment.page.workspaceId,
        action: 'COMMENT_RESOLVED',
        userId,
        pageId: comment.pageId,
        details: { commentId },
      });
    }

    return updated;
  }

  static async createReply(commentId: string, authorId: string, content: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw NotFoundError('Comment not found');

    return prisma.commentReply.create({
      data: {
        commentId,
        authorId,
        content,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, cursorColor: true, avatarUrl: true },
        },
      },
    });
  }

  static async deleteReply(replyId: string, userId: string, isAdminOrOwner = false) {
    const reply = await prisma.commentReply.findUnique({ where: { id: replyId } });
    if (!reply) throw NotFoundError('Reply not found');

    if (reply.authorId !== userId && !isAdminOrOwner) {
      throw ForbiddenError('You can only delete your own reply');
    }

    await prisma.commentReply.delete({ where: { id: replyId } });
    return { success: true };
  }
}
