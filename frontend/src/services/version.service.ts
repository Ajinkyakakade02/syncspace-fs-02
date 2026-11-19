import { api } from './api';
import { PageVersion } from '../types';

export const versionService = {
  async list(pageId: string): Promise<PageVersion[]> {
    const res = await api.get(`/pages/${pageId}/versions`);
    return res.data.data;
  },

  async create(pageId: string, data: { name: string; description?: string }): Promise<PageVersion> {
    const res = await api.post(`/pages/${pageId}/versions`, data);
    return res.data.data;
  },

  async getById(pageId: string, versionId: string): Promise<PageVersion> {
    const res = await api.get(`/pages/${pageId}/versions/${versionId}`);
    return res.data.data;
  },

  async restore(pageId: string, versionId: string): Promise<{ success: boolean; newGeneration: number; message: string }> {
    const res = await api.post(`/pages/${pageId}/versions/${versionId}/restore`);
    return res.data.data;
  },
};
