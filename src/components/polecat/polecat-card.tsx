'use client';

import { cn, formatRelativeTime, formatDuration } from '@/lib/utils';
import type { Polecat } from '@/types/beads';
import { StatusBadge } from './status-badge';

interface PolecatCardProps {
  polecat: Polecat;
  onViewSession?: (polecat: Polecat) => void;
  onNudge?: (polecat: Polecat) => void;
  onNuke?: (polecat: Polecat) => void;
}

export function PolecatCard({
  polecat,
  onViewSession,
  onNudge,
  onNuke,
}: PolecatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900/50 p-4 transition-all hover:bg-gray-900/70',
        {
          'border-green-500/30': polecat.status === 'active',
          'border-gray-700': polecat.status === 'idle',
          'border-blue-500/30': polecat.status === 'spawning',
          'border-purple-500/30': polecat.status === 'done',
          'border-red-500/30': polecat.status === 'error',
        }
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{polecat.name}</h3>
          <p className="text-xs text-gray-500">{polecat.id}</p>
        </div>
        <StatusBadge status={polecat.status} />
      </div>

      {/* Metrics */}
      <div className="space-y-2 mb-4">
        {polecat.hooked_work && (
          <div className="text-sm">
            <span className="text-gray-500">Working on: </span>
            <span className="text-orange-400 font-mono text-xs">
              {polecat.hooked_work}
            </span>
          </div>
        )}

        {polecat.branch && (
          <div className="text-sm">
            <span className="text-gray-500">Branch: </span>
            <span className="text-blue-400 font-mono text-xs truncate">
              {polecat.branch}
            </span>
          </div>
        )}

        {polecat.convoy && (
          <div className="text-sm">
            <span className="text-gray-500">Convoy: </span>
            <span className="text-purple-400">{polecat.convoy}</span>
          </div>
        )}

        <div className="flex gap-4 text-xs text-gray-500">
          {polecat.session_start && (
            <span>Session: {formatDuration(polecat.session_start)}</span>
          )}
          {polecat.last_activity && (
            <span>Active: {formatRelativeTime(polecat.last_activity)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <button
          onClick={() => onViewSession?.(polecat)}
          className="flex-1 px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          View Session
        </button>
        <button
          onClick={() => onNudge?.(polecat)}
          className="flex-1 px-2 py-1 text-xs rounded bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 transition-colors"
        >
          Nudge
        </button>
        <button
          onClick={() => onNuke?.(polecat)}
          className="px-2 py-1 text-xs rounded bg-red-900/30 hover:bg-red-800/50 text-red-400 transition-colors"
        >
          Nuke
        </button>
      </div>
    </div>
  );
}
