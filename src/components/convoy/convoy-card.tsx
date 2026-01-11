'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import type { Convoy } from '@/types/beads';
import { ConvoyStatusBadge } from './convoy-status-badge';
import { ProgressBar } from './progress-bar';

interface ConvoyCardProps {
  convoy: Convoy;
  onClick?: (convoy: Convoy) => void;
  onNudge?: (convoy: Convoy) => void;
}

export function ConvoyCard({ convoy, onClick, onNudge }: ConvoyCardProps) {
  const isStalled = convoy.status === 'stalled';

  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900/50 p-4 transition-all hover:bg-gray-900/70',
        {
          'border-green-500/30': convoy.status === 'active',
          'border-purple-500/30': convoy.status === 'completed',
          'border-amber-500/30 ring-1 ring-amber-500/20': isStalled,
        },
        onClick && 'cursor-pointer'
      )}
      onClick={() => onClick?.(convoy)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{convoy.title}</h3>
          <p className="text-xs text-gray-500 font-mono">{convoy.id}</p>
        </div>
        <ConvoyStatusBadge status={convoy.status} />
      </div>

      {/* Progress */}
      <div className="mb-3">
        <ProgressBar
          completed={convoy.progress.completed}
          total={convoy.progress.total}
          size="md"
        />
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4 text-sm">
        {convoy.assignee && (
          <div>
            <span className="text-gray-500">Assigned: </span>
            <span className="text-blue-400">{convoy.assignee}</span>
          </div>
        )}
        <div>
          <span className="text-gray-500">Issues: </span>
          <span className="text-gray-300">{convoy.issues.length}</span>
        </div>
        <div className="text-xs text-gray-500">
          Updated {formatRelativeTime(convoy.updated_at)}
        </div>
      </div>

      {/* Stalled warning */}
      {isStalled && (
        <div className="mb-3 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400">
            This convoy appears stalled. Consider nudging the worker.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(convoy);
          }}
          className="flex-1 px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          View Details
        </button>
        {convoy.status !== 'completed' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNudge?.(convoy);
            }}
            className="flex-1 px-2 py-1 text-xs rounded bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 transition-colors"
          >
            Nudge Worker
          </button>
        )}
      </div>
    </div>
  );
}
