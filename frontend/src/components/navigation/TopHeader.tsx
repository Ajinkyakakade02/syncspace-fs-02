import React from 'react';
import { MessageSquare, History, Share2 } from 'lucide-react';
import { Page, Workspace, ConnectionStatus, CollaboratorPresence } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';

interface TopHeaderProps {
  workspace: Workspace | null;
  page: Page | null;
  connectionStatus: ConnectionStatus;
  remoteUsers: CollaboratorPresence[];
  unresolvedCommentsCount: number;
  isCommentsOpen: boolean;
  isHistoryOpen: boolean;
  onToggleComments: () => void;
  onToggleHistory: () => void;
  onOpenShareModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  workspace,
  page,
  connectionStatus,
  remoteUsers,
  unresolvedCommentsCount,
  isCommentsOpen,
  isHistoryOpen,
  onToggleComments,
  onToggleHistory,
  onOpenShareModal,
}) => {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between z-20">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
        <span className="truncate max-w-[140px] font-medium text-slate-700 dark:text-slate-300">
          {workspace?.name || 'Workspace'}
        </span>
        <span>/</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm">{page?.icon || '📄'}</span>
          <span className="truncate max-w-[200px] font-semibold text-slate-900 dark:text-slate-100">
            {page?.title || 'Untitled'}
          </span>
        </div>
      </div>

      {/* Center / Right Toolbar */}
      <div className="flex items-center gap-3">
        {/* Connection & Sync Status */}
        <StatusBadge status={connectionStatus} />

        {/* Live Collaborators Presence */}
        {remoteUsers.length > 0 && (
          <div className="flex items-center -space-x-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            {remoteUsers.slice(0, 5).map((user, idx) => (
              <div key={idx} className="relative group">
                <Avatar
                  name={user.name}
                  color={user.color}
                  size="sm"
                  className="ring-2 ring-white dark:ring-slate-900 cursor-pointer"
                />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block px-2 py-0.5 text-[10px] font-semibold text-white bg-slate-900 rounded whitespace-nowrap z-50">
                  {user.name} ({user.role.toLowerCase()})
                </span>
              </div>
            ))}
            {remoteUsers.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold flex items-center justify-center text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900">
                +{remoteUsers.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Comments Drawer Button */}
        <button
          onClick={onToggleComments}
          className={`relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            isCommentsOpen ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : ''
          }`}
          title="Comments"
        >
          <MessageSquare className="w-4 h-4" />
          {unresolvedCommentsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-600 text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
              {unresolvedCommentsCount}
            </span>
          )}
        </button>

        {/* Version History Drawer Button */}
        <button
          onClick={onToggleHistory}
          className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            isHistoryOpen ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : ''
          }`}
          title="Version History & Restore"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Share Button */}
        <Button size="sm" variant="outline" onClick={onOpenShareModal} className="text-xs">
          <Share2 className="w-3.5 h-3.5 mr-1" />
          Share
        </Button>
      </div>
    </header>
  );
};
