import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  ChevronDown,
  Users,
  Moon,
  Sun,
  LogOut,
  FolderPlus,
  Trash2,
  Search,
  Sparkles,
} from 'lucide-react';
import { Workspace, Page } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';

interface SidebarProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  pages: Page[];
  currentPageId?: string;
  onSelectWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: () => void;
  onCreatePage: () => void;
  onDeletePage: (pageId: string) => void;
  onOpenShareModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspaces,
  currentWorkspace,
  pages,
  currentPageId,
  onSelectWorkspace,
  onCreateWorkspace,
  onCreatePage,
  onDeletePage,
  onOpenShareModal,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManage = currentWorkspace?.currentUserRole === 'OWNER' || currentWorkspace?.currentUserRole === 'ADMIN';

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 select-none">
      {/* Workspace Switcher Header */}
      <div className="p-3 border-b border-slate-800 relative">
        <button
          onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
              {currentWorkspace?.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {currentWorkspace?.name || 'Select Workspace'}
              </p>
              <p className="text-[11px] text-slate-400 capitalize">
                {currentWorkspace?.currentUserRole?.toLowerCase() || 'Member'}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isWorkspaceMenuOpen && (
          <div className="absolute left-3 right-3 top-16 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1.5 z-50">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Your Workspaces
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws);
                    setIsWorkspaceMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-700/60 transition-colors ${
                    ws.id === currentWorkspace?.id ? 'bg-slate-700/80 text-brand-400 font-semibold' : 'text-slate-200'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900/50">
                    {ws.currentUserRole}
                  </span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-700/80 pt-1 mt-1">
              <button
                onClick={() => {
                  setIsWorkspaceMenuOpen(false);
                  onCreateWorkspace();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-400 hover:bg-slate-700/60 font-medium transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Create Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/70 text-xs text-slate-200 rounded-md placeholder-slate-500 border border-transparent focus:border-brand-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Pages Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <span>Documents</span>
          {canManage && (
            <button
              onClick={onCreatePage}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
              title="New Document"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filteredPages.map((page) => {
          const isActive = page.id === currentPageId;
          return (
            <div
              key={page.id}
              onClick={() => navigate(`/workspace/${currentWorkspace?.id}/page/${page.id}`)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400 font-semibold border-l-2 border-brand-500'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{page.icon || '📄'}</span>
                <span className="truncate">{page.title || 'Untitled'}</span>
              </div>
              {canManage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete document "${page.title}"?`)) {
                      onDeletePage(page.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 rounded transition-opacity"
                  title="Delete page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {filteredPages.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-500">
            No documents found.
          </div>
        )}
      </div>

      {/* Workspace Footer Actions */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={onOpenShareModal}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700/80 text-xs text-slate-200 font-medium rounded-lg transition-colors border border-slate-700"
        >
          <Users className="w-3.5 h-3.5 text-brand-400" />
          <span>Members & Sharing</span>
        </button>

        {/* User Profile Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={user?.name || 'User'} color={user?.cursorColor || '#3b82f6'} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle Dark/Light Mode"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
