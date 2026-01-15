'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import { useTheme } from '@/lib/theme-provider';
import type { Convoy, Issue } from '@/types/beads';

interface ConvoyCardProps {
  convoy: Convoy;
  issues?: Issue[];
  onClick?: (convoy: Convoy) => void;
  onContextMenu?: (e: React.MouseEvent, convoy: Convoy) => void;
}

export function ConvoyCard({ convoy, issues = [], onClick, onContextMenu }: ConvoyCardProps) {
  const { theme } = useTheme();
  const isKawaii = theme === 'smorgasbord';

  // Status configuration matching beads pattern
  const statusConfig = {
    active: {
      borderClass: 'border-l-green-500',
      dotClass: 'bg-green-500',
      textClass: 'text-green-600 dark:text-green-400',
      bgHover: 'hover:bg-green-50 dark:hover:bg-green-950/10',
    },
    completed: {
      borderClass: 'border-l-purple-500',
      dotClass: 'bg-purple-500',
      textClass: 'text-purple-600 dark:text-purple-400',
      bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-950/10',
    },
    stalled: {
      borderClass: 'border-l-amber-500',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-600 dark:text-amber-400',
      bgHover: 'hover:bg-amber-50 dark:hover:bg-amber-950/10',
    },
  };

  const config = statusConfig[convoy.status];
  const progressPercent = convoy.progress.total > 0
    ? Math.round((convoy.progress.completed / convoy.progress.total) * 100)
    : 0;

  return (
    <div
      className={cn(
        'group cursor-pointer rounded-md border border-l-4 bg-white p-4 shadow-sm transition-all',
        'hover:shadow-md hover:border-zinc-300',
        'dark:bg-zinc-800 dark:border-zinc-700 dark:hover:border-zinc-600',
        config.borderClass,
        config.bgHover
      )}
      onClick={() => onClick?.(convoy)}
      onContextMenu={(e) => onContextMenu?.(e, convoy)}
    >
      {/* Header - matches beads style */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="text-base">{isKawaii ? '🚚' : '⛟'}</span>
          <span className="font-mono">{convoy.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white',
              config.dotClass
            )}
            title={`${progressPercent}% complete`}
          >
            {progressPercent}
          </span>
          {convoy.issues.length > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {convoy.issues.length} beads
            </span>
          )}
        </div>
      </div>

      {/* Title - more prominent like beads */}
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3 line-clamp-2">
        {convoy.title}
      </h3>

      {/* Progress bar - more compact */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          <span>{convoy.progress.completed} / {convoy.progress.total} issues</span>
          <span className={config.textClass}>{progressPercent}%</span>
        </div>
        <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all', config.dotClass)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Details row */}
      <div className="flex items-center justify-end text-xs mb-3">
        <span className="text-zinc-400 dark:text-zinc-500">
          {formatRelativeTime(convoy.updated_at)}
        </span>
      </div>

      {/* Stalled warning - more compact */}
      {convoy.status === 'stalled' && (
        <div className="mb-3 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
          Stalled - consider nudging workers
        </div>
      )}

      {/* Issue breakdown - full detail */}
      {issues.length > 0 && (() => {
        const convoyIssues = issues.filter(issue => convoy.issues.includes(issue.id));
        const inProgressIssues = convoyIssues.filter(i => i.status === 'in_progress' || i.status === 'hooked');
        const blockedIssues = convoyIssues.filter(i => i.status === 'blocked');
        const openIssues = convoyIssues.filter(i => i.status === 'open');
        const closedIssues = convoyIssues.filter(i => i.status === 'closed');

        if (convoyIssues.length === 0) return null;

        return (
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
            {/* In Progress Issues */}
            {inProgressIssues.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">
                  In Progress ({inProgressIssues.length})
                </div>
                {inProgressIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="text-xs p-2 rounded bg-green-500/10 border border-green-500/20 mb-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded font-medium">
                        {issue.status === 'hooked' ? 'Hooked' : 'In Progress'}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300 line-clamp-1">{issue.title}</span>
                    </div>
                    {issue.assignee && (
                      <div className="text-zinc-500 dark:text-zinc-400 mt-1">Assignee: {issue.assignee}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Blocked Issues */}
            {blockedIssues.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                  Blocked ({blockedIssues.length})
                </div>
                {blockedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="text-xs p-2 rounded bg-red-500/10 border border-red-500/20 mb-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 rounded font-medium">Blocked</span>
                      <span className="text-zinc-700 dark:text-zinc-300 line-clamp-1">{issue.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Open Issues */}
            {openIssues.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Open ({openIssues.length})
                </div>
                {openIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="text-xs p-2 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mb-1"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300 line-clamp-1">{issue.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Closed Issues */}
            {closedIssues.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Closed ({closedIssues.length})
                </div>
                {closedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="text-xs p-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-1"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400 line-through line-clamp-1">{issue.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
