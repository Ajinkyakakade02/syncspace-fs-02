import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workspaceService } from '../services/workspace.service';
import { Button } from '../components/common/Button';
import { Users, CheckCircle2, ArrowRight } from 'lucide-react';

export const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await workspaceService.acceptInvitation(token);
      navigate(`/workspace/${result.workspaceId}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to accept invitation. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mx-auto flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Workspace Invitation</h2>
          <p className="text-xs text-slate-400">
            You've been invited to collaborate on SyncSpace.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Signed in as <strong>{user.name}</strong> ({user.email})
            </p>
            <Button size="lg" className="w-full" onClick={handleAccept} isLoading={isLoading}>
              Accept Invitation & Join
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Please sign in or create an account to accept this invite.</p>
            <div className="flex gap-2">
              <Link to="/login" className="flex-1">
                <Button variant="secondary" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" className="flex-1">
                <Button className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
