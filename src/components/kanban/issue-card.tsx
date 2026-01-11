'use client';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { Issue, Priority } from '@/types/beads';

interface IssueCardProps {
  issue: Issue;
  onClick?: (issue: Issue) => void;
  onDragStart?: (e: React.DragEvent, issue: Issue) => void;
  onContextMenu?: (e: React.MouseEvent, issue: Issue) => void;
  isDragging?: boolean;
}

const priorityConfig: Record<Priority, { label: string; className: string; dotClass: string }> = {
  0: {
    label: 'P0',
    className: 'border-l-red-500',
    dotClass: 'bg-red-500',
  },
  1: {
    label: 'P1',
    className: 'border-l-orange-500',
    dotClass: 'bg-orange-500',
  },
  2: {
    label: 'P2',
    className: 'border-l-yellow-500',
    dotClass: 'bg-yellow-500',
  },
  3: {
    label: 'P3',
    className: 'border-l-blue-500',
    dotClass: 'bg-blue-500',
  },
  4: {
    label: 'P4',
    className: 'border-l-gray-500',
    dotClass: 'bg-gray-500',
  },
};

const issueTypeIcons: Record<string, string> = {
  task: '◆',
  feature: '★',
  bug: '●',
  molecule: '◎',
  agent: '◉',
};

export function IssueCard({
  issue,
  onClick,
  onDragStart,
  onContextMenu,
  isDragging,
}: IssueCardProps) {
  const priority = priorityConfig[issue.priority];
  const typeIcon = issueTypeIcons[issue.issue_type] || '◇';

  const extractRig = (assignee?: string): string | null => {
    if (!assignee) return null;
    const match = assignee.match(/^([^/]+)/);
    return match ? match[1] : null;
  };

  const extractAssigneeName = (assignee?: string): string | null => {
    if (!assignee) return null;
    const parts = assignee.split('/');
    return parts[parts.length - 1] || null;
  };

  const rig = extractRig(issue.assignee);
  const assigneeName = extractAssigneeName(issue.assignee);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, issue)}
      onClick={() => onClick?.(issue)}
      onContextMenu={(e) => onContextMenu?.(e, issue)}
      className={cn(
        'group cursor-pointer rounded-md border border-l-4 bg-white p-3 shadow-sm transition-all',
        'hover:shadow-md hover:border-zinc-300',
        'dark:bg-zinc-800 dark:border-zinc-700 dark:hover:border-zinc-600',
        priority.className,
        isDragging && 'opacity-50 rotate-2 scale-105'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span title={issue.issue_type}>{typeIcon}</span>
          <span className="font-mono">{issue.id}</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white',
              priority.dotClass
            )}
          >
            {issue.priority}
          </span>
        </div>
      </div>

      <h4 className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
        {issue.title}
      </h4>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rig && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {rig}
            </span>
          )}
          {assigneeName && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {assigneeName}
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {formatRelativeTime(issue.updated_at)}
        </span>
      </div>

      {issue.dependencies && issue.dependencies.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          <span>⛓</span>
          <span>{issue.dependencies.length} dep{issue.dependencies.length > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
