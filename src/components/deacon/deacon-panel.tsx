'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DeaconStatus {
  alive: boolean;
  pid: number | null;
  version: string | null;
  started_at: string | null;
  uptime_seconds: number | null;
  interval: string;
  last_activity: string | null;
  recent_logs: string[];
  error_logs: string[];
}

interface OrphanedBead {
  id: string;
  title?: string;
  polecat?: string;
  rig?: string;
  reason: string;
}

interface SweepPreview {
  orphaned_beads: OrphanedBead[];
  summary: {
    total_orphaned: number;
    would_close: number;
  };
}

interface DeaconPanelProps {
  pollingInterval?: number;
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatLogLine(line: string): string {
  // Extract just the message from the structured log
  // Format: time=... level=... msg="..."
  const msgMatch = line.match(/msg="([^"]+)"|msg=([^\s]+)/);
  if (msgMatch) {
    return msgMatch[1] || msgMatch[2] || line;
  }
  return line;
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  } catch {
    return timestamp;
  }
}

export function DeaconPanel({ pollingInterval = 5000 }: DeaconPanelProps) {
  const [status, setStatus] = useState<DeaconStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [sweepPreview, setSweepPreview] = useState<SweepPreview | null>(null);
  const [sweepPending, setSweepPending] = useState(false);
  const [sweepResult, setSweepResult] = useState<{ closed: number; errors: number } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/deacon');
      if (!response.ok) {
        throw new Error('Failed to fetch deacon status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, pollingInterval]);

  const handleControl = async (action: 'start' | 'stop' | 'restart') => {
    setActionPending(true);
    try {
      const response = await fetch('/api/deacon/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error || `Failed to ${action} deacon`);
      }
      // Refresh status after action
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Control action failed');
    } finally {
      setActionPending(false);
    }
  };

  const handleSweepPreview = async () => {
    setSweepPending(true);
    setSweepResult(null);
    try {
      const response = await fetch('/api/deacon/sweep');
      if (!response.ok) {
        throw new Error('Failed to preview orphaned beads');
      }
      const data = await response.json();
      setSweepPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sweep preview failed');
    } finally {
      setSweepPending(false);
    }
  };

  const handleSweepExecute = async () => {
    setSweepPending(true);
    try {
      const response = await fetch('/api/deacon/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      setSweepResult({
        closed: result.summary?.closed ?? 0,
        errors: result.summary?.errors ?? 0,
      });
      setSweepPreview(null);
      if (!result.success) {
        setError(result.error || 'Some beads failed to close');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sweep execution failed');
    } finally {
      setSweepPending(false);
    }
  };

  const handleSweepCancel = () => {
    setSweepPreview(null);
    setSweepResult(null);
  };

  if (isLoading && !status) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-100">Deacon</h3>
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium',
              status?.alive
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                status?.alive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              )}
            />
            {status?.alive ? 'Alive' : 'Dead'}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSweepPreview}
            disabled={sweepPending || actionPending}
            className="px-3 py-1.5 text-xs rounded bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sweepPending ? 'Scanning...' : 'Sweep Orphans'}
          </button>
          {status?.alive ? (
            <button
              onClick={() => handleControl('restart')}
              disabled={actionPending}
              className="px-3 py-1.5 text-xs rounded bg-yellow-900/50 hover:bg-yellow-800/50 text-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionPending ? 'Restarting...' : 'Restart'}
            </button>
          ) : (
            <button
              onClick={() => handleControl('start')}
              disabled={actionPending}
              className="px-3 py-1.5 text-xs rounded bg-green-900/50 hover:bg-green-800/50 text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionPending ? 'Starting...' : 'Start'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 rounded bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Sweep Preview */}
      {sweepPreview && (
        <div className="mb-4 p-3 rounded bg-purple-900/20 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-purple-300">
              Orphaned Beads Found: {sweepPreview.summary.total_orphaned}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handleSweepCancel}
                className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              {sweepPreview.summary.total_orphaned > 0 && (
                <button
                  onClick={handleSweepExecute}
                  disabled={sweepPending}
                  className="px-2 py-1 text-xs rounded bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-50"
                >
                  {sweepPending ? 'Closing...' : 'Close All'}
                </button>
              )}
            </div>
          </div>
          {sweepPreview.orphaned_beads.length > 0 ? (
            <div className="max-h-32 overflow-y-auto">
              {sweepPreview.orphaned_beads.map((bead, idx) => (
                <div
                  key={idx}
                  className="py-1 text-xs font-mono text-purple-200 border-b border-purple-500/10 last:border-0"
                >
                  <span className="text-purple-400">{bead.id}</span>
                  {bead.title && <span className="text-zinc-400 ml-2">{bead.title}</span>}
                  {bead.polecat && (
                    <span className="text-zinc-500 ml-2">({bead.polecat})</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-purple-400">No orphaned beads found</div>
          )}
        </div>
      )}

      {/* Sweep Result */}
      {sweepResult && (
        <div className="mb-4 p-3 rounded bg-green-900/20 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-300">
              Sweep complete: {sweepResult.closed} closed
              {sweepResult.errors > 0 && (
                <span className="text-red-400 ml-2">({sweepResult.errors} errors)</span>
              )}
            </div>
            <button
              onClick={handleSweepCancel}
              className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-zinc-800/50 rounded p-3">
          <div className="text-xs text-zinc-500 mb-1">PID</div>
          <div className="text-sm font-mono text-zinc-300">
            {status?.pid ?? 'N/A'}
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded p-3">
          <div className="text-xs text-zinc-500 mb-1">Uptime</div>
          <div className="text-sm font-mono text-zinc-300">
            {formatUptime(status?.uptime_seconds ?? null)}
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded p-3">
          <div className="text-xs text-zinc-500 mb-1">Interval</div>
          <div className="text-sm font-mono text-zinc-300">
            {status?.interval ?? 'N/A'}
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded p-3">
          <div className="text-xs text-zinc-500 mb-1">Last Activity</div>
          <div className="text-sm font-mono text-zinc-300">
            {formatTimestamp(status?.last_activity ?? null)}
          </div>
        </div>
      </div>

      {/* Version info */}
      {status?.version && (
        <div className="text-xs text-zinc-500 mb-4">
          Version: <span className="text-zinc-400">{status.version}</span>
        </div>
      )}

      {/* Log Tail */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-zinc-400">Recent Logs</h4>
        </div>
        <div className="bg-zinc-950 rounded p-3 font-mono text-xs max-h-32 overflow-y-auto">
          {status?.recent_logs && status.recent_logs.length > 0 ? (
            status.recent_logs.map((log, idx) => (
              <div
                key={idx}
                className={cn(
                  'py-0.5',
                  log.includes('level=ERROR') || log.includes('level=WARN')
                    ? 'text-yellow-500'
                    : 'text-zinc-500'
                )}
              >
                {formatLogLine(log)}
              </div>
            ))
          ) : (
            <div className="text-zinc-600">No recent logs</div>
          )}
        </div>
      </div>

      {/* Error Logs */}
      {status?.error_logs && status.error_logs.length > 0 && (
        <div className="border-t border-zinc-800 pt-4 mt-4">
          <h4 className="text-sm font-medium text-red-400 mb-2">
            Errors/Warnings
          </h4>
          <div className="bg-red-950/30 rounded p-3 font-mono text-xs max-h-24 overflow-y-auto">
            {status.error_logs.map((log, idx) => (
              <div key={idx} className="py-0.5 text-red-400">
                {formatLogLine(log)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
