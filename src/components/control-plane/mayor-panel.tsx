'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { MayorState, MayorStatus } from '@/types/mayor';
import { useMayorStatus } from '@/lib/use-mayor';

interface StatusIndicatorProps {
  status: MayorStatus;
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const config: Record<MayorStatus, { label: string; className: string; dotClass: string }> = {
    online: {
      label: 'Online',
      className: 'bg-green-500/20 text-green-400 border-green-500/30',
      dotClass: 'bg-green-400 animate-pulse',
    },
    offline: {
      label: 'Offline',
      className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      dotClass: 'bg-gray-400',
    },
    busy: {
      label: 'Busy',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      dotClass: 'bg-yellow-400 animate-pulse',
    },
  };

  const { label, className, dotClass } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', dotClass)} />
      {label}
    </span>
  );
}

interface ContextUsageBarProps {
  percent: number;
}

function ContextUsageBar({ percent }: ContextUsageBarProps) {
  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Context Usage</span>
        <span className={cn(
          'font-mono',
          percent >= 90 ? 'text-red-400' : percent >= 70 ? 'text-yellow-400' : 'text-green-400'
        )}>
          {percent}%
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor(percent))}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function MayorPanel() {
  const { mayorState, isLoading, error, refresh, sendNudge } = useMayorStatus();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [nudgeStatus, setNudgeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSendNudge = useCallback(async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    setNudgeStatus(null);

    try {
      await sendNudge(message.trim());
      setNudgeStatus({ type: 'success', message: 'Nudge sent successfully' });
      setMessage('');
    } catch (err) {
      setNudgeStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send nudge',
      });
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, sendNudge]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendNudge();
    }
  };

  if (isLoading && !mayorState) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          <span className="text-gray-400">Loading Mayor status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between">
          <span className="text-red-400">Failed to load Mayor status</span>
          <button
            onClick={refresh}
            className="px-3 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const status = mayorState?.status ?? 'offline';
  const session = mayorState?.session;

  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900/50 p-6 transition-all',
        {
          'border-green-500/30': status === 'online',
          'border-gray-700': status === 'offline',
          'border-yellow-500/30': status === 'busy',
        }
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Mayor</h2>
          <StatusIndicator status={status} />
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <svg
            className={cn('w-4 h-4', isLoading && 'animate-spin')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Context Usage */}
      {session && (
        <div className="mb-6">
          <ContextUsageBar percent={session.contextUsagePercent} />
        </div>
      )}

      {/* Session Info */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Uptime</span>
            <p className="text-white font-mono">{session?.uptime ?? 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Last Activity</span>
            <p className="text-white font-mono">{session?.lastActivity ?? 'N/A'}</p>
          </div>
        </div>
        {session?.currentTask && (
          <div className="text-sm">
            <span className="text-gray-500">Current Task</span>
            <p className="text-orange-400 font-mono text-xs mt-1 truncate">
              {session.currentTask}
            </p>
          </div>
        )}
      </div>

      {/* Nudge Input */}
      <div className="border-t border-gray-800 pt-4">
        <label className="block text-xs text-gray-500 mb-2">Send Nudge</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message for Mayor..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            disabled={isSending || status === 'offline'}
          />
          <button
            onClick={handleSendNudge}
            disabled={!message.trim() || isSending || status === 'offline'}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded transition-colors',
              message.trim() && !isSending && status !== 'offline'
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            )}
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>
        {nudgeStatus && (
          <p
            className={cn(
              'mt-2 text-xs',
              nudgeStatus.type === 'success' ? 'text-green-400' : 'text-red-400'
            )}
          >
            {nudgeStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
