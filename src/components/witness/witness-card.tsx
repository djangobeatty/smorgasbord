'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import type { Witness, WitnessStatus } from '@/types/beads';

interface WitnessCardProps {
  witness: Witness;
  onNudge?: (witness: Witness) => void;
  onStart?: (witness: Witness) => void;
}

const statusConfig: Record<WitnessStatus, { label: string; borderClass: string; badgeClass: string; dotClass: string }> = {
  active: {
    label: 'Active',
    borderClass: 'border-green-500/30',
    badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
    dotClass: 'bg-green-400 animate-pulse',
  },
  idle: {
    label: 'Idle',
    borderClass: 'border-gray-700',
    badgeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    dotClass: 'bg-gray-400',
  },
  error: {
    label: 'Error',
    borderClass: 'border-red-500/30',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    dotClass: 'bg-red-400',
  },
  stopped: {
    label: 'Stopped',
    borderClass: 'border-orange-500/30',
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    dotClass: 'bg-orange-400',
  },
};

export function WitnessCard({ witness, onNudge, onStart }: WitnessCardProps) {
  const config = statusConfig[witness.status];
  const isStopped = witness.status === 'stopped';

  return (
    <div
      className={cn(
        'rounded-lg border bg-gray-900/50 p-4 transition-all hover:bg-gray-900/70',
        config.borderClass
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{witness.rig}</h3>
          <p className="text-xs text-gray-500 font-mono">{witness.id}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
            config.badgeClass
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', config.dotClass)} />
          {config.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-2 mb-4">
        {witness.last_check && (
          <div className="text-sm">
            <span className="text-gray-500">Last check: </span>
            <span className="text-zinc-300">{formatRelativeTime(witness.last_check)}</span>
          </div>
        )}

        <div className="text-sm">
          <span className="text-gray-500">Unread mail: </span>
          <span className={cn(
            'font-mono',
            witness.unread_mail > 0 ? 'text-yellow-400' : 'text-zinc-400'
          )}>
            {witness.unread_mail}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <button
          onClick={() => onNudge?.(witness)}
          className="flex-1 px-2 py-1 text-xs rounded bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 transition-colors"
        >
          Nudge
        </button>
        <button
          onClick={() => onStart?.(witness)}
          className={cn(
            'flex-1 px-2 py-1 text-xs rounded transition-colors',
            isStopped
              ? 'bg-green-900/50 hover:bg-green-800/50 text-green-300'
              : 'bg-orange-900/50 hover:bg-orange-800/50 text-orange-300'
          )}
        >
          {isStopped ? 'Start' : 'Restart'}
        </button>
      </div>
    </div>
  );
}
