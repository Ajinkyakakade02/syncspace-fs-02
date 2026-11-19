import { Role, InvitationStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { NotFoundError, ForbiddenError, ConflictError, AppError } from '../utils/errors.js';
import { generateRandomToken, hashToken } from '../utils/crypto.js';
import { ActivityService } from './activity.service.js';

export class WorkspaceService {
  static async createWorkspace(userId: string, data: { name: string; description?: string }) {
    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
        pages: {
          create: {
            title: 'Welcome to your new workspace 🚀',
            icon: '📄',
            order: 0,
            createdById: userId,
            lastEditedById: userId,
            collaborationDocuments: {
              create: {
                generation: 1,
                snapshot: Buffer.from([]),
              },
            },
          },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, cursorColor: true } } } },
        pages: true,
      },
    });

    await ActivityService.log({
      workspaceId: workspace.id,
      action: 'WORKSPACE_CREATED',
      userId,
      details: { name: workspace.name },
    });

    return workspace;
  }

  static async listUserWorkspaces(userId: string) {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            _count: {
              select: {
                members: true,
                pages: { where: { isArchived: false } },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      currentUserRole: m.role,
    }));
  }

  static async getWorkspaceById(workspaceId: string, userId: string) {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!membership) {
      throw ForbiddenError('You are not a member of this workspace');
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: { select: { id: true, name: true, email: true, cursorColor: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, cursorColor: true, avatarUrl: true } },
          },
        },
        pages: {
          where: { isArchived: false },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            icon: true,
            order: true,
            collaborationGeneration: true,
            createdAt: true,
            updatedAt: true,
            lastEditedBy: { select: { id: true, name: true } },
          },
        },
        invitations: {
          where: { status: 'PENDING', expiresAt: { gt: new Date() } },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!workspace) throw NotFoundError('Workspace not found');

    return {
      ...workspace,
      currentUserRole: membership.role,
    };
  }

  static async updateWorkspace(workspaceId: string, userId: string, data: { name?: string; description?: string }) {
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });

    await ActivityService.log({
      workspaceId,
      action: 'WORKSPACE_UPDATED',
      userId,
      details: data,
    });

    return updated;
  }

  static async deleteWorkspace(workspaceId: string, userId: string) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw NotFoundError('Workspace not found');
    if (workspace.ownerId !== userId) {
      throw ForbiddenError('Only the workspace owner can delete the workspace');
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
    return { success: true };
  }

  // --- Member Management ---

  static async getMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, cursorColor: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  static async createInvitation(
    workspaceId: string,
    inviterId: string,
    data: { email: string; role: Role }
  ) {
    const existingMember = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        workspaceMemberships: { where: { workspaceId } },
      },
    });

    if (existingMember && existingMember.workspaceMemberships.length > 0) {
      throw ConflictError('User is already a member of this workspace');
    }

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        inviterId,
        email: data.email,
        tokenHash,
        role: data.role,
        expiresAt,
      },
    });

    await ActivityService.log({
      workspaceId,
      action: 'MEMBER_INVITED',
      userId: inviterId,
      details: { email: data.email, role: data.role },
    });

    return {
      rawToken,
      email: data.email,
      role: data.role,
      expiresAt,
    };
  }

  static async acceptInvitation(rawToken: string, userId: string) {
    const tokenHash = hashToken(rawToken);
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: { workspace: true },
    });

    if (!invitation) {
      throw NotFoundError('Invitation not found or invalid');
    }

    if (invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      throw new AppError('This invitation link has expired or has already been used', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw NotFoundError('User not found');

    // Add member
    const member = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId,
        },
      },
      update: {
        role: invitation.role,
      },
      create: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      },
    });

    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    await ActivityService.log({
      workspaceId: invitation.workspaceId,
      action: 'MEMBER_JOINED',
      userId,
      details: { role: invitation.role },
    });

    return {
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspace.name,
      role: member.role,
    };
  }

  static async updateMemberRole(workspaceId: string, memberId: string, newRole: Role, requesterId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { workspace: true },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw NotFoundError('Workspace member not found');
    }

    if (member.userId === member.workspace.ownerId) {
      throw ForbiddenError('Cannot change the role of the workspace owner');
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, email: true, cursorColor: true } },
      },
    });

    await ActivityService.log({
      workspaceId,
      action: 'MEMBER_ROLE_UPDATED',
      userId: requesterId,
      details: { targetUserId: member.userId, newRole },
    });

    return updated;
  }

  static async removeMember(workspaceId: string, memberId: string, requesterId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { workspace: true },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw NotFoundError('Workspace member not found');
    }

    if (member.userId === member.workspace.ownerId) {
      throw ForbiddenError('Cannot remove the workspace owner');
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    await ActivityService.log({
      workspaceId,
      action: 'MEMBER_REMOVED',
      userId: requesterId,
      details: { targetUserId: member.userId },
    });

    return { success: true };
  }
}
