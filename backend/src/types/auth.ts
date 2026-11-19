import { Role } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  cursorColor: string;
}

export interface AccessTokenPayload extends UserPayload {
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  type: 'refresh';
}

export interface CollabTicketPayload {
  userId: string;
  name: string;
  email: string;
  cursorColor: string;
  workspaceId: string;
  pageId: string;
  role: Role;
  generation: number;
  canEdit: boolean;
  type: 'collab-ticket';
}
