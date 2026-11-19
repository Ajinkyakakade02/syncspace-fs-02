import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, verifyAccessToken, signCollabTicket, verifyCollabTicket } from '../utils/jwt.js';

describe('Authentication & Cryptographic Utilities', () => {
  it('should hash passwords securely with bcrypt and verify correctly', async () => {
    const raw = 'SecurePassword123!';
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await comparePassword(raw, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('WrongPassword!', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('should sign and verify access tokens', () => {
    const userPayload = {
      id: 'test-user-uuid-123',
      email: 'alex@syncspace.io',
      name: 'Alex Developer',
      cursorColor: '#3b82f6',
    };

    const token = signAccessToken(userPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(userPayload.id);
    expect(decoded.email).toBe(userPayload.email);
    expect(decoded.type).toBe('access');
  });

  it('should generate and verify short-lived collaboration tickets with room scope and role', () => {
    const ticketPayload = {
      userId: 'user-456',
      name: 'Bob Collaborator',
      email: 'bob@syncspace.io',
      cursorColor: '#10b981',
      workspaceId: 'workspace-789',
      pageId: 'page-101',
      role: 'EDITOR' as const,
      generation: 2,
      canEdit: true,
    };

    const ticket = signCollabTicket(ticketPayload);
    expect(typeof ticket).toBe('string');

    const verified = verifyCollabTicket(ticket);
    expect(verified.userId).toBe('user-456');
    expect(verified.pageId).toBe('page-101');
    expect(verified.role).toBe('EDITOR');
    expect(verified.generation).toBe(2);
    expect(verified.canEdit).toBe(true);
    expect(verified.type).toBe('collab-ticket');
  });

  it('should reject tampered collaboration tickets', () => {
    const ticketPayload = {
      userId: 'user-456',
      name: 'Viewer User',
      email: 'viewer@syncspace.io',
      cursorColor: '#f59e0b',
      workspaceId: 'workspace-789',
      pageId: 'page-101',
      role: 'VIEWER' as const,
      generation: 1,
      canEdit: false,
    };

    const ticket = signCollabTicket(ticketPayload);
    // Tamper with ticket string
    const tampered = ticket.slice(0, -5) + 'XXXXX';

    expect(() => verifyCollabTicket(tampered)).toThrow();
  });
});
