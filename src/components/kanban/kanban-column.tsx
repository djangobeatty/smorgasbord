'use client';

import { cn } from '@/lib/utils';
import type { Issue } from '@/types/beads';
import { IssueCard } from './issue-card';

interface KanbanColumnProps {
  title: string;
  status: string;
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
  onIssueDragStart?: (e: React.DragEvent, issue: Issue) => void;
  onIssueContextMenu?: (e: React.MouseEvent, issue: Issue) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, status: string) => void;
  isDropTarget?: boolean;
}

const columnConfig: Record<string, { color: string; bgColor: string }> = {
  open: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  in_progress: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  blocked: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  closed: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
};

export function KanbanColumn({
  title,
  status,
  issues,
  onIssueClick,
  onIssueDragStart,
  onIssueContextMenu,
  onDragOver,
  onDrop,
  isDropTarget,
}: KanbanColumnProps) {
  const config = columnConfig[status] || columnConfig.open;

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50',
        'min-h-[500px] transition-all',
        isDropTarget && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-950'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(e, status);
      }}
    >
      <div
        className={cn(
          'sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-zinc-200 px-3 py-2',
          'dark:border-zinc-800',
          config.bgColor
        )}
      >
        <h3
          className={cn(
            'text-sm font-semibold uppercase tracking-wide',
            config.color
          )}
        >
          {title}
        </h3>
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium',
            config.bgColor,
            config.color
          )}
        >
          {issues.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {issues.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
            No items
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={onIssueClick}
              onDragStart={onIssueDragStart}
              onContextMenu={onIssueContextMenu}
            />
          ))
        )}
      </div>
    </div>
  );
}
