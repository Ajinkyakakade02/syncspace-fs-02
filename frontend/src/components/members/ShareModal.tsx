import React, { useState, useEffect } from 'react';
import { Copy, Check, UserPlus, Trash2, Shield } from 'lucide-react';
import { Workspace, WorkspaceMember, Role } from '../../types';
import { workspaceService } from '../../services/workspace.service';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Avatar } from '../common/Avatar';

interface ShareModalProps {
  workspace: Workspace | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: Role;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  workspace,
  isOpen,
  onClose,
  currentUserRole = 'VIEWER',
}) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('EDITOR');
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const loadMembers = async () => {
    if (!workspace) return;
    try {
      const data = await workspaceService.getMembers(workspace.id);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  useEffect(() => {
    if (isOpen && workspace) {
      loadMembers();
      setInviteUrl(null);
    }
  }, [isOpen, workspace]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !email.trim() || !canManage) return;

    try {
      setIsLoading(true);
      const invitation = await workspaceService.invite(workspace.id, {
        email: email.trim(),
        role,
      });

      const url = `${window.location.origin}/invite/${invitation.rawToken}`;
      setInviteUrl(url);
      setEmail('');
      await loadMembers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    if (!workspace || !canManage) return;
    try {
      await workspaceService.updateMemberRole(workspace.id, memberId, newRole);
      await loadMembers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspace || !canManage) return;
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await workspaceService.removeMember(workspace.id, memberId);
      await loadMembers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to remove member');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${workspace?.name || 'Workspace'}"`}
      description="Invite collaborators and manage access permissions for this workspace."
      maxWidth="lg"
    >
      <div className="space-y-6 pt-2 select-none">
        {/* Invite Form */}
        {canManage && (
          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
                <option value="COMMENTER">Commenter</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <Button type="submit" isLoading={isLoading}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Invite
              </Button>
            </div>

            {/* Generated Share Link Box */}
            {inviteUrl && (
              <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-200 dark:border-brand-800 space-y-1.5">
                <p className="text-xs font-semibold text-brand-900 dark:text-brand-300">
                  Invitation link generated (valid for 7 days):
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 rounded border border-brand-300 dark:border-brand-700 font-mono text-slate-700 dark:text-slate-300 select-all"
                  />
                  <Button size="sm" variant="secondary" onClick={handleCopyLink}>
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* Members List */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Workspace Members ({members.length})
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={member.user.name} color={member.user.cursorColor} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {member.user.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canManage && member.role !== 'OWNER' ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                      className="text-xs py-1 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="EDITOR">Editor</option>
                      <option value="COMMENTER">Commenter</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                      {member.role.toLowerCase()}
                    </span>
                  )}

                  {canManage && member.role !== 'OWNER' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
