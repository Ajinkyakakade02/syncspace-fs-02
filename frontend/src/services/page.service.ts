import { api } from './api';
import { Page, Role } from '../types';

export interface CollabTicketResponse {
  ticket: string;
  pageId: string;
  workspaceId: string;
  generation: number;
  role: Role;
  canEdit: boolean;
  expiresInSeconds: number;
}

export const pageService = {
  async list(workspaceId: string): Promise<Page[]> {
    const res = await api.get(`/workspaces/${workspaceId}/pages`);
    return res.data.data;
  },

  async getById(pageId: string): Promise<Page> {
    const res = await api.get(`/pages/${pageId}`);
    return res.data.data;
  },

  async create(workspaceId: string, data: { title: string; icon?: string; order?: number }): Promise<Page> {
    const res = await api.post(`/workspaces/${workspaceId}/pages`, data);
    return res.data.data;
  },

  async update(pageId: string, data: { title?: string; icon?: string; order?: number; isArchived?: boolean }): Promise<Page> {
    const res = await api.patch(`/pages/${pageId}`, data);
    return res.data.data;
  },

  async delete(pageId: string) {
    const res = await api.delete(`/pages/${pageId}`);
    return res.data;
  },

  async getCollaborationTicket(pageId: string): Promise<CollabTicketResponse> {
    const res = await api.post(`/pages/${pageId}/collaboration-ticket`);
    return res.data.data;
  },

  async getCollaborationStatus(pageId: string) {
    const res = await api.get(`/pages/${pageId}/collaboration-status`);
    return res.data.data;
  },
};
