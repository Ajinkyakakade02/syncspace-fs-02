export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'COMMENTER' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  cursorColor: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: User;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: Role;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  slug?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  currentUserRole?: Role;
  owner?: User;
  members?: WorkspaceMember[];
  pages?: Page[];
  invitations?: WorkspaceInvitation[];
  _count?: {
    members: number;
    pages: number;
  };
}

export interface Page {
  id: string;
  workspaceId: string;
  title: string;
  icon?: string | null;
  order: number;
  createdById: string;
  lastEditedById?: string | null;
  collaborationGeneration: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  lastEditedBy?: User;
  workspace?: { id: string; name: string };
  _count?: {
    comments: number;
    versions: number;
  };
}

export interface PageVersion {
  id: string;
  pageId: string;
  generation: number;
  name: string;
  description?: string | null;
  createdAt: string;
  sizeBytes: number;
  restoredFromId?: string | null;
  createdBy: User;
}

export interface CommentAnchor {
  from?: number;
  to?: number;
  quote?: string;
}

export interface CommentReply {
  id: string;
  commentId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
}

export interface Comment {
  id: string;
  pageId: string;
  authorId: string;
  content: string;
  anchor?: CommentAnchor | null;
  isResolved: boolean;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author: User;
  resolvedBy?: User | null;
  replies: CommentReply[];
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';

export interface CollaboratorPresence {
  id: string;
  name: string;
  color: string;
  role: Role;
  canEdit: boolean;
}
