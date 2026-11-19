import { api } from './api';
import { Comment, CommentAnchor } from '../types';

export const commentService = {
  async list(pageId: string): Promise<Comment[]> {
    const res = await api.get(`/pages/${pageId}/comments`);
    return res.data.data;
  },

  async create(pageId: string, data: { content: string; anchor?: CommentAnchor }): Promise<Comment> {
    const res = await api.post(`/pages/${pageId}/comments`, data);
    return res.data.data;
  },

  async update(commentId: string, content: string): Promise<Comment> {
    const res = await api.patch(`/comments/${commentId}`, { content });
    return res.data.data;
  },

  async delete(commentId: string) {
    const res = await api.delete(`/comments/${commentId}`);
    return res.data;
  },

  async toggleResolve(commentId: string): Promise<Comment> {
    const res = await api.patch(`/comments/${commentId}/resolve`);
    return res.data.data;
  },

  async createReply(commentId: string, content: string) {
    const res = await api.post(`/comments/${commentId}/replies`, { content });
    return res.data.data;
  },

  async deleteReply(replyId: string) {
    const res = await api.delete(`/comments/replies/${replyId}`);
    return res.data;
  },
};
