import React, { useState, useEffect } from 'react';
import { X, Check, MessageSquare, Reply, Trash2, Send } from 'lucide-react';
import { Comment, User } from '../../types';
import { commentService } from '../../services/comment.service';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';

interface CommentsDrawerProps {
  pageId: string;
  isOpen: boolean;
  currentUser: User | null;
  canComment: boolean;
  onClose: () => void;
  onCommentsUpdated: (count: number) => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  pageId,
  isOpen,
  currentUser,
  canComment,
  onClose,
  onCommentsUpdated,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState<{ [commentId: string]: string }>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [isLoading, setIsLoading] = useState(false);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const data = await commentService.list(pageId);
      setComments(data);
      const unresolvedCount = data.filter((c) => !c.isResolved).length;
      onCommentsUpdated(unresolvedCount);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && pageId) {
      loadComments();
    }
  }, [isOpen, pageId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !canComment) return;

    try {
      await commentService.create(pageId, { content: newComment.trim() });
      setNewComment('');
      await loadComments();
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const handleAddReply = async (commentId: string) => {
    const text = replyText[commentId]?.trim();
    if (!text || !canComment) return;

    try {
      await commentService.createReply(commentId, text);
      setReplyText((prev) => ({ ...prev, [commentId]: '' }));
      setActiveReplyId(null);
      await loadComments();
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  const handleToggleResolve = async (commentId: string) => {
    try {
      await commentService.toggleResolve(commentId);
      await loadComments();
    } catch (err) {
      console.error('Failed to toggle comment resolve:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await commentService.delete(commentId);
      await loadComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  if (!isOpen) return null;

  const filteredComments = comments.filter((c) => {
    if (filter === 'open') return !c.isResolved;
    if (filter === 'resolved') return c.isResolved;
    return true;
  });

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full z-20 shadow-lg select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Comments</h3>
          <span className="text-xs text-slate-400">({comments.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900 text-xs">
        <button
          onClick={() => setFilter('open')}
          className={`flex-1 py-1 rounded font-medium transition-colors ${
            filter === 'open'
              ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Open ({comments.filter((c) => !c.isResolved).length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`flex-1 py-1 rounded font-medium transition-colors ${
            filter === 'resolved'
              ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Resolved ({comments.filter((c) => c.isResolved).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1 rounded font-medium transition-colors ${
            filter === 'all'
              ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          All
        </button>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredComments.map((comment) => (
          <div
            key={comment.id}
            className={`p-3 rounded-xl border transition-all ${
              comment.isResolved
                ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75'
                : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 shadow-sm'
            }`}
          >
            {/* Author info & Actions */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Avatar
                  name={comment.author.name}
                  color={comment.author.cursorColor || '#3b82f6'}
                  size="xs"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                    {comment.author.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(comment.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleResolve(comment.id)}
                  className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                    comment.isResolved ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'
                  }`}
                  title={comment.isResolved ? 'Mark as unresolved' : 'Mark as resolved'}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                {comment.authorId === currentUser?.id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {comment.content}
            </p>

            {/* Replies List */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="text-xs space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">
                        {reply.author.name}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input Box */}
            {activeReplyId === comment.id ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyText[comment.id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                  placeholder="Write a reply..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  rows={2}
                />
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setActiveReplyId(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleAddReply(comment.id)}>
                    Reply
                  </Button>
                </div>
              </div>
            ) : (
              canComment && (
                <button
                  onClick={() => setActiveReplyId(comment.id)}
                  className="mt-2 text-[11px] text-slate-400 hover:text-brand-500 flex items-center gap-1 font-medium transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
              )
            )}
          </div>
        ))}

        {filteredComments.length === 0 && !isLoading && (
          <div className="py-12 text-center text-xs text-slate-400">
            No {filter} comments on this document.
          </div>
        )}
      </div>

      {/* New Comment Box */}
      {canComment ? (
        <form onSubmit={handleAddComment} className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment to this document..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={!newComment.trim()}>
              <Send className="w-3 h-3 mr-1" />
              Comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
          Viewing only. Comments disabled.
        </div>
      )}
    </aside>
  );
};
