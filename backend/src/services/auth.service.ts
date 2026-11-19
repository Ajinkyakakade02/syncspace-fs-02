import { prisma } from '../prisma/client.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { hashToken, generateRandomToken } from '../utils/crypto.js';
import { AppError, ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { ActivityService } from './activity.service.js';

const CURSOR_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

export class AuthService {
  static async register(data: { name: string; email: string; password: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(data.password);
    // Assign a random pleasant cursor color
    const cursorColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        cursorColor,
      },
    });

    // Auto-create a default personal workspace for the user
    const workspace = await prisma.workspace.create({
      data: {
        name: `${user.name.split(' ')[0]}'s Workspace`,
        description: 'My personal collaborative workspace',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
        pages: {
          create: {
            title: 'Welcome to SyncSpace 👋',
            icon: '🚀',
            order: 0,
            createdById: user.id,
            lastEditedById: user.id,
            collaborationDocuments: {
              create: {
                generation: 1,
                // Empty initial Yjs document snapshot bytes
                snapshot: Buffer.from([]),
              },
            },
          },
        },
      },
      include: {
        pages: true,
      },
    });

    await ActivityService.log({
      workspaceId: workspace.id,
      action: 'USER_REGISTERED',
      userId: user.id,
      details: { email: user.email },
    });

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      cursorColor: user.cursorColor,
    });

    const refreshTokenRaw = generateRandomToken();
    const tokenHash = hashToken(refreshTokenRaw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshTokenRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      tokenId: refreshTokenRecord.id,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cursorColor: user.cursorColor,
      },
      accessToken,
      refreshToken,
      defaultWorkspaceId: workspace.id,
      defaultPageId: workspace.pages[0]?.id,
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw UnauthorizedError('Invalid email or password');
    }

    const passwordMatch = await comparePassword(data.password, user.passwordHash);
    if (!passwordMatch) {
      throw UnauthorizedError('Invalid email or password');
    }

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      cursorColor: user.cursorColor,
    });

    const refreshTokenRaw = generateRandomToken();
    const tokenHash = hashToken(refreshTokenRaw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const refreshTokenRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      tokenId: refreshTokenRecord.id,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cursorColor: user.cursorColor,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(refreshTokenStr: string) {
    try {
      const payload = verifyRefreshToken(refreshTokenStr);
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { id: payload.tokenId },
        include: { user: true },
      });

      if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
        throw UnauthorizedError('Refresh token invalid or expired');
      }

      // Rotate refresh token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked: true },
      });

      const newRefreshTokenRaw = generateRandomToken();
      const tokenHash = hashToken(newRefreshTokenRaw);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const newRecord = await prisma.refreshToken.create({
        data: {
          userId: tokenRecord.user.id,
          tokenHash,
          expiresAt,
        },
      });

      const newAccessToken = signAccessToken({
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        name: tokenRecord.user.name,
        cursorColor: tokenRecord.user.cursorColor,
      });

      const newRefreshToken = signRefreshToken({
        userId: tokenRecord.user.id,
        tokenId: newRecord.id,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: tokenRecord.user.id,
          name: tokenRecord.user.name,
          email: tokenRecord.user.email,
          cursorColor: tokenRecord.user.cursorColor,
        },
      };
    } catch (err) {
      throw UnauthorizedError('Invalid or expired refresh token');
    }
  }

  static async logout(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return { success: true };
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw NotFoundError('User not found');

    const match = await comparePassword(currentPass, user.passwordHash);
    if (!match) throw UnauthorizedError('Incorrect current password');

    const passwordHash = await hashPassword(newPass);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all existing sessions on password change
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cursorColor: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) throw NotFoundError('User not found');
    return user;
  }
}
