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
      className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
      dotClass: 'bg-green-500 dark:bg-green-400 animate-pulse',
    },
    offline: {
      label: 'Offline',
      className: 'bg-muted text-muted-foreground border-border',
      dotClass: 'bg-muted-foreground/50',
    },
    busy: {
      label: 'Busy',
      className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
      dotClass: 'bg-yellow-500 dark:bg-yellow-400 animate-pulse',
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
        <span className="text-muted-foreground">Context Usage</span>
        <span className={cn(
          'font-mono',
          percent >= 90 ? 'text-red-600 dark:text-red-400' : percent >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
        )}>
          {percent}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
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
  const [isRestarting, setIsRestarting] = useState(false);
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

  const handleRestartMayor = useCallback(async () => {
    setIsRestarting(true);
    setNudgeStatus(null);

    try {
      const response = await fetch('/api/mayor/restart', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || 'Failed to restart mayor');
      }

      setNudgeStatus({ type: 'success', message: data.message || 'Mayor restart initiated' });

      // Refresh status after a delay
      setTimeout(() => {
        refresh();
      }, 2000);
    } catch (err) {
      setNudgeStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to restart mayor',
      });
    } finally {
      setIsRestarting(false);
    }
  }, [refresh]);

  if (isLoading && !mayorState) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-muted-foreground">Loading Mayor status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-destructive">Failed to load Mayor status</span>
          <button
            onClick={refresh}
            className="px-3 py-1 text-xs rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
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
        'rounded-lg border bg-card p-6 transition-all shadow-sm',
        {
          'border-green-500/30': status === 'online',
          'border-border': status === 'offline',
          'border-yellow-500/30': status === 'busy',
        }
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Mayor</h2>
          <StatusIndicator status={status} />
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
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
            <span className="text-muted-foreground">Uptime</span>
            <p className="text-foreground font-mono">{session?.uptime ?? 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Activity</span>
            <p className="text-foreground font-mono">{session?.lastActivity ?? 'N/A'}</p>
          </div>
        </div>
        {session?.currentTask && (
          <div className="text-sm">
            <span className="text-muted-foreground">Current Task</span>
            <p className="text-orange-600 dark:text-orange-400 font-mono text-xs mt-1 truncate">
              {session.currentTask}
            </p>
          </div>
        )}
      </div>

      {/* Offline Alert + Restart Button */}
      {status === 'offline' && (
        <div className="mb-4 p-3 rounded bg-destructive/10 border border-destructive/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-destructive font-medium">Mayor is offline</span>
            </div>
            <button
              onClick={handleRestartMayor}
              disabled={isRestarting}
              className="px-3 py-1 text-sm rounded bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors disabled:opacity-50"
            >
              {isRestarting ? 'Restarting...' : 'Restart Mayor'}
            </button>
          </div>
        </div>
      )}

      {/* Nudge Input */}
      <div className="border-t border-border pt-4">
        <label className="block text-xs text-muted-foreground mb-2">
          Send Nudge {status === 'offline' && <span className="text-destructive">(Mayor offline)</span>}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === 'offline' ? 'Mayor is offline' : 'Type a message for Mayor...'}
            className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
            disabled={isSending || status === 'offline'}
          />
          <button
            onClick={handleSendNudge}
            disabled={!message.trim() || isSending || status === 'offline'}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded transition-colors',
              message.trim() && !isSending && status !== 'offline'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
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
              nudgeStatus.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-destructive'
            )}
          >
            {nudgeStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
