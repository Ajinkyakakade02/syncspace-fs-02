import React, { useState, useEffect } from 'react';
import { X, History, Plus, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PageVersion, User, Role } from '../../types';
import { versionService } from '../../services/version.service';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface VersionHistoryDrawerProps {
  pageId: string;
  isOpen: boolean;
  userRole: Role;
  currentUser: User | null;
  onClose: () => void;
  onVersionRestored: (newGeneration: number) => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  pageId,
  isOpen,
  userRole,
  onClose,
  onVersionRestored,
}) => {
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';

  const loadVersions = async () => {
    try {
      setIsLoading(true);
      const data = await versionService.list(pageId);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && pageId) {
      loadVersions();
    }
  }, [isOpen, pageId]);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim() || !canManage) return;

    try {
      await versionService.create(pageId, {
        name: snapshotName.trim(),
        description: snapshotDesc.trim() || undefined,
      });
      setSnapshotName('');
      setSnapshotDesc('');
      setIsSnapshotModalOpen(false);
      await loadVersions();
    } catch (err) {
      console.error('Failed to create document snapshot:', err);
    }
  };

  const handleRestore = async (version: PageVersion) => {
    if (!canManage) return;

    const confirmed = window.confirm(
      `Restore document to snapshot "${version.name}" (Gen ${version.generation})?\n\nThis will safely bump the collaboration generation and reconnect all participants to the restored snapshot state.`
    );
    if (!confirmed) return;

    try {
      setIsRestoring(true);
      const result = await versionService.restore(pageId, version.id);
      await loadVersions();
      onVersionRestored(result.newGeneration);
    } catch (err) {
      console.error('Failed to restore document version:', err);
      alert('Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full z-20 shadow-lg select-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Version History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Snapshot trigger */}
        {canManage && (
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSnapshotModalOpen(true)}
              className="w-full text-xs justify-center"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-brand-600" />
              Save Named Snapshot
            </Button>
          </div>
        )}

        {/* Snapshot list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {versions.map((ver) => (
            <div
              key={ver.id}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/70 transition-all shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-1">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {ver.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(ver.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                  Gen {ver.generation}
                </span>
              </div>

              {ver.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {ver.description}
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span>By {ver.createdBy?.name || 'User'}</span>
                <span>{(ver.sizeBytes / 1024).toFixed(1)} KB</span>
              </div>

              {canManage && (
                <div className="pt-1 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(ver)}
                    disabled={isRestoring}
                    className="text-[11px] h-7 px-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Restore this version
                  </Button>
                </div>
              )}
            </div>
          ))}

          {versions.length === 0 && !isLoading && (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-30" />
              <p>No snapshots recorded yet.</p>
              {canManage && <p className="text-[11px]">Save a snapshot to mark milestones.</p>}
            </div>
          )}
        </div>
      </aside>

      {/* Named Snapshot Creation Modal */}
      <Modal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        title="Save Named Snapshot"
        description="Capture the current state of this collaborative document as an immutable restorable milestone."
      >
        <form onSubmit={handleCreateSnapshot} className="space-y-4 pt-2">
          <Input
            label="Snapshot Name"
            placeholder="e.g. Q4 Sprint Planning Finalized"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            required
            autoFocus
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <textarea
              value={snapshotDesc}
              onChange={(e) => setSnapshotDesc(e.target.value)}
              placeholder="Add release notes or context..."
              className="w-full text-sm p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsSnapshotModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!snapshotName.trim()}>
              Save Snapshot
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
