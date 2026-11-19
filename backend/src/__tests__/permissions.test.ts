import { describe, it, expect } from 'vitest';
import {
  ROLE_HIERARCHY,
  hasMinimumRole,
  canEditContent,
  canComment,
  canManageMembers,
  canManageWorkspace,
  canRestoreVersions,
} from '../types/roles.js';

describe('Role-Based Access Control & Permissions', () => {
  it('should enforce role hierarchy correctly', () => {
    expect(ROLE_HIERARCHY['OWNER']).toBeGreaterThan(ROLE_HIERARCHY['ADMIN']);
    expect(ROLE_HIERARCHY['ADMIN']).toBeGreaterThan(ROLE_HIERARCHY['EDITOR']);
    expect(ROLE_HIERARCHY['EDITOR']).toBeGreaterThan(ROLE_HIERARCHY['COMMENTER']);
    expect(ROLE_HIERARCHY['COMMENTER']).toBeGreaterThan(ROLE_HIERARCHY['VIEWER']);
  });

  it('should validate minimum role requirements', () => {
    expect(hasMinimumRole('OWNER', 'ADMIN')).toBe(true);
    expect(hasMinimumRole('ADMIN', 'EDITOR')).toBe(true);
    expect(hasMinimumRole('EDITOR', 'COMMENTER')).toBe(true);
    expect(hasMinimumRole('VIEWER', 'EDITOR')).toBe(false);
    expect(hasMinimumRole('COMMENTER', 'ADMIN')).toBe(false);
  });

  it('should restrict document content editing to Owner, Admin, and Editor', () => {
    expect(canEditContent('OWNER')).toBe(true);
    expect(canEditContent('ADMIN')).toBe(true);
    expect(canEditContent('EDITOR')).toBe(true);
    expect(canEditContent('COMMENTER')).toBe(false);
    expect(canEditContent('VIEWER')).toBe(false);
  });

  it('should allow Commenters to comment but not edit documents', () => {
    expect(canComment('COMMENTER')).toBe(true);
    expect(canEditContent('COMMENTER')).toBe(false);

    expect(canComment('VIEWER')).toBe(false);
    expect(canEditContent('VIEWER')).toBe(false);
  });

  it('should restrict workspace management & member management', () => {
    expect(canManageWorkspace('OWNER')).toBe(true);
    expect(canManageWorkspace('ADMIN')).toBe(false);
    expect(canManageWorkspace('EDITOR')).toBe(false);

    expect(canManageMembers('OWNER')).toBe(true);
    expect(canManageMembers('ADMIN')).toBe(true);
    expect(canManageMembers('EDITOR')).toBe(false);
  });

  it('should restrict version restores to Owner and Admin', () => {
    expect(canRestoreVersions('OWNER')).toBe(true);
    expect(canRestoreVersions('ADMIN')).toBe(true);
    expect(canRestoreVersions('EDITOR')).toBe(false);
    expect(canRestoreVersions('VIEWER')).toBe(false);
  });
});
