import { api } from './api';
import { Workspace, Role, WorkspaceMember } from '../types';

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    const res = await api.get('/workspaces');
    return res.data.data;
  },

  async getById(id: string): Promise<Workspace> {
    const res = await api.get(`/workspaces/${id}`);
    return res.data.data;
  },

  async create(data: { name: string; description?: string }): Promise<Workspace> {
    const res = await api.post('/workspaces', data);
    return res.data.data;
  },

  async update(id: string, data: { name?: string; description?: string }): Promise<Workspace> {
    const res = await api.patch(`/workspaces/${id}`, data);
    return res.data.data;
  },

  async delete(id: string) {
    const res = await api.delete(`/workspaces/${id}`);
    return res.data;
  },

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const res = await api.get(`/workspaces/${workspaceId}/members`);
    return res.data.data;
  },

  async invite(workspaceId: string, data: { email: string; role: Role }) {
    const res = await api.post(`/workspaces/${workspaceId}/invitations`, data);
    return res.data.data;
  },

  async acceptInvitation(token: string) {
    const res = await api.post(`/invitations/${token}/accept`);
    return res.data.data;
  },

  async updateMemberRole(workspaceId: string, memberId: string, role: Role) {
    const res = await api.patch(`/workspaces/${workspaceId}/members/${memberId}/role`, { role });
    return res.data.data;
  },

  async removeMember(workspaceId: string, memberId: string) {
    const res = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    return res.data;
  },
};
