'use client';

import { cn } from '@/lib/utils';
import type { Convoy } from '@/types/beads';

type ConvoyStatus = Convoy['status'];

interface ConvoyStatusBadgeProps {
  status: ConvoyStatus;
  className?: string;
}

const statusConfig: Record<ConvoyStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  stalled: {
    label: 'Stalled',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};

export function ConvoyStatusBadge({ status, className }: ConvoyStatusBadgeProps) {
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
          'bg-purple-400': status === 'completed',
          'bg-amber-400 animate-pulse': status === 'stalled',
        })}
      />
      {config.label}
    </span>
  );
}
