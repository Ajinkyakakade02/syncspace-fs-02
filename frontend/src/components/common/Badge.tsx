import React from 'react';
import { ConnectionStatus } from '../../types';

export const StatusBadge: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const configs = {
    connected: {
      color: 'bg-emerald-500',
      text: 'Synced',
      bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    connecting: {
      color: 'bg-amber-500 animate-pulse',
      text: 'Connecting...',
      bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    reconnecting: {
      color: 'bg-amber-500 animate-pulse',
      text: 'Reconnecting...',
      bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    offline: {
      color: 'bg-slate-400',
      text: 'Offline',
      bg: 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    },
    error: {
      color: 'bg-rose-500',
      text: 'Sync Error',
      bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    },
  };

  const current = configs[status] || configs.connecting;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${current.bg}`}>
      <span className={`w-2 h-2 rounded-full ${current.color}`} />
      <span>{current.text}</span>
    </div>
  );
};
