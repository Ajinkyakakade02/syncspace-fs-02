import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Workspace, Page } from '../types';
import { workspaceService } from '../services/workspace.service';
import { pageService } from '../services/page.service';
import { useCollaboration } from '../hooks/useCollaboration';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopHeader } from '../components/navigation/TopHeader';
import { CollaborativeEditor } from '../components/editor/CollaborativeEditor';
import { CommentsDrawer } from '../components/comments/CommentsDrawer';
import { VersionHistoryDrawer } from '../components/history/VersionHistoryDrawer';
import { ShareModal } from '../components/members/ShareModal';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

export const EditorPage: React.FC = () => {
  const { workspaceId, pageId } = useParams<{ workspaceId: string; pageId?: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);

  // Panels & Modals State
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNewWsModalOpen, setIsNewWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [unresolvedComments, setUnresolvedComments] = useState(0);

  // Load workspaces
  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await workspaceService.list();
      setWorkspaces(data);
      if (data.length > 0) {
        const targetWsId = workspaceId || data[0].id;
        const fullWs = await workspaceService.getById(targetWsId);
        setCurrentWorkspace(fullWs);
        setPages(fullWs.pages || []);

        // If no pageId in URL, route to the first page of the workspace
        if (!pageId && fullWs.pages && fullWs.pages.length > 0) {
          navigate(`/workspace/${fullWs.id}/page/${fullWs.pages[0].id}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  }, [workspaceId, pageId, navigate]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      loadWorkspaces();
    }
  }, [user, authLoading, loadWorkspaces, navigate]);

  // Load current page
  useEffect(() => {
    const fetchPage = async () => {
      if (pageId) {
        try {
          const p = await pageService.getById(pageId);
          setCurrentPage(p);
          setUnresolvedComments(p._count?.comments || 0);
        } catch (err) {
          console.error('Failed to load page:', err);
        }
      }
    };
    fetchPage();
  }, [pageId]);

  // Initialize Real-time Yjs CRDT Collaboration
  const { ydoc, awareness, status, remoteUsers, canEdit, userRole } = useCollaboration({
    pageId: currentPage?.id || '',
    generation: currentPage?.collaborationGeneration || 1,
    user,
  });

  // Page handlers
  const handleCreatePage = async () => {
    if (!currentWorkspace) return;
    try {
      const newPage = await pageService.create(currentWorkspace.id, {
        title: 'Untitled Document',
        icon: '📄',
      });
      setPages((prev) => [...prev, newPage]);
      navigate(`/workspace/${currentWorkspace.id}/page/${newPage.id}`);
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  };

  const handleDeletePage = async (id: string) => {
    try {
      await pageService.delete(id);
      const remaining = pages.filter((p) => p.id !== id);
      setPages(remaining);
      if (id === currentPage?.id) {
        if (remaining.length > 0) {
          navigate(`/workspace/${currentWorkspace?.id}/page/${remaining[0].id}`);
        } else {
          setCurrentPage(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete page:', err);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (currentPage) {
      setCurrentPage({ ...currentPage, title: newTitle });
      setPages((prev) =>
        prev.map((p) => (p.id === currentPage.id ? { ...p, title: newTitle } : p))
      );
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const created = await workspaceService.create({ name: newWsName.trim() });
      setNewWsName('');
      setIsNewWsModalOpen(false);
      await loadWorkspaces();
      if (created.pages && created.pages.length > 0) {
        navigate(`/workspace/${created.id}/page/${created.pages[0].id}`);
      }
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const handleVersionRestored = (newGen: number) => {
    if (currentPage) {
      // Bumping the collaborationGeneration causes useCollaboration to cleanly re-mount into the new generation!
      setCurrentPage({
        ...currentPage,
        collaborationGeneration: newGen,
      });
    }
  };

  if (authLoading || (!currentWorkspace && workspaces.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        pages={pages}
        currentPageId={currentPage?.id}
        onSelectWorkspace={(ws) => {
          setCurrentWorkspace(ws);
          navigate(`/workspace/${ws.id}`);
        }}
        onCreateWorkspace={() => setIsNewWsModalOpen(true)}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <TopHeader
          workspace={currentWorkspace}
          page={currentPage}
          connectionStatus={status}
          remoteUsers={remoteUsers}
          unresolvedCommentsCount={unresolvedComments}
          isCommentsOpen={isCommentsOpen}
          isHistoryOpen={isHistoryOpen}
          onToggleComments={() => {
            setIsCommentsOpen(!isCommentsOpen);
            setIsHistoryOpen(false);
          }}
          onToggleHistory={() => {
            setIsHistoryOpen(!isHistoryOpen);
            setIsCommentsOpen(false);
          }}
          onOpenShareModal={() => setIsShareModalOpen(true)}
        />

        {/* Editor Body */}
        <div className="flex-1 flex overflow-hidden">
          {currentPage ? (
            <CollaborativeEditor
              key={`${currentPage.id}-gen-${currentPage.collaborationGeneration}`}
              page={currentPage}
              ydoc={ydoc}
              awareness={awareness}
              currentUser={user}
              canEdit={canEdit}
              userRole={userRole}
              onTitleChange={handleTitleChange}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <p className="text-sm font-medium">No document selected</p>
              <Button size="sm" onClick={handleCreatePage} className="mt-3">
                Create your first document
              </Button>
            </div>
          )}

          {/* Comments Panel */}
          {currentPage && (
            <CommentsDrawer
              pageId={currentPage.id}
              isOpen={isCommentsOpen}
              currentUser={user}
              canComment={canEdit || userRole === 'COMMENTER'}
              onClose={() => setIsCommentsOpen(false)}
              onCommentsUpdated={(count) => setUnresolvedComments(count)}
            />
          )}

          {/* Version History & Restore Panel */}
          {currentPage && (
            <VersionHistoryDrawer
              pageId={currentPage.id}
              isOpen={isHistoryOpen}
              userRole={userRole}
              currentUser={user}
              onClose={() => setIsHistoryOpen(false)}
              onVersionRestored={handleVersionRestored}
            />
          )}
        </div>
      </div>

      {/* Share / Invite Modal */}
      <ShareModal
        workspace={currentWorkspace}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUserRole={currentWorkspace?.currentUserRole}
      />

      {/* Create New Workspace Modal */}
      <Modal
        isOpen={isNewWsModalOpen}
        onClose={() => setIsNewWsModalOpen(false)}
        title="Create New Workspace"
        description="Workspaces group documents, settings, and team members together."
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-2">
          <Input
            label="Workspace Name"
            placeholder="e.g. Mobile Engineering Team"
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsNewWsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newWsName.trim()}>
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
