import { api } from './api';
import { User } from '../types';

export const authService = {
  async register(data: { name: string; email: string; password: string; confirmPassword: string }) {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  async login(data: { email: string; password: string }) {
    const res = await api.post('/auth/login', data);
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('syncspace_access_token');
      localStorage.removeItem('syncspace_user');
    }
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    const res = await api.post('/auth/change-password', data);
    return res.data;
  },
};
