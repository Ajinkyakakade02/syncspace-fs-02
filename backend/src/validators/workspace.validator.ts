import { z } from 'zod';
import { Role } from '@prisma/client';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(60),
  description: z.string().max(255).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(60).optional(),
  description: z.string().max(255).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.enum(['ADMIN', 'EDITOR', 'COMMENTER', 'VIEWER'] as const).default('EDITOR'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR', 'COMMENTER', 'VIEWER'] as const),
});
