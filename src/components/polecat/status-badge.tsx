'use client';

import { cn } from '@/lib/utils';
import type { AgentState } from '@/types/beads';

interface StatusBadgeProps {
  status: AgentState;
  className?: string;
}

const statusConfig: Record<AgentState, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  idle: {
    label: 'Idle',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  spawning: {
    label: 'Spawning',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  done: {
    label: 'Done',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full mr-1.5', {
          'bg-green-400 animate-pulse': status === 'active',
          'bg-gray-400': status === 'idle',
          'bg-blue-400 animate-pulse': status === 'spawning',
          'bg-purple-400': status === 'done',
          'bg-red-400': status === 'error',
        })}
      />
      {config.label}
    </span>
  );
}
