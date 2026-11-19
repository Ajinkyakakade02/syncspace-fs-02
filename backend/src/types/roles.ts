import { Role } from '@prisma/client';

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 50,
  ADMIN: 40,
  EDITOR: 30,
  COMMENTER: 20,
  VIEWER: 10,
};

export const hasMinimumRole = (userRole: Role, requiredRole: Role): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export const canEditContent = (role: Role): boolean => {
  return role === 'OWNER' || role === 'ADMIN' || role === 'EDITOR';
};

export const canComment = (role: Role): boolean => {
  return role === 'OWNER' || role === 'ADMIN' || role === 'EDITOR' || role === 'COMMENTER';
};

export const canManageMembers = (role: Role): boolean => {
  return role === 'OWNER' || role === 'ADMIN';
};

export const canManageWorkspace = (role: Role): boolean => {
  return role === 'OWNER';
};

export const canManagePages = (role: Role): boolean => {
  return role === 'OWNER' || role === 'ADMIN';
};

export const canRestoreVersions = (role: Role): boolean => {
  return role === 'OWNER' || role === 'ADMIN';
};
