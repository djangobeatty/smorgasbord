'use client';

import { cn } from '@/lib/utils';
import type { Issue, IssueStatus } from '@/types/beads';
import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  issue: Issue | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onStatusChange?: (issue: Issue, status: IssueStatus) => void;
  onAssign?: (issue: Issue) => void;
  onViewDetails?: (issue: Issue) => void;
}

const statusOptions: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'hooked', label: 'Hooked' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'closed', label: 'Closed' },
];

export function ContextMenu({
  issue,
  position,
  onClose,
  onStatusChange,
  onAssign,
  onViewDetails,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (issue && position) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [issue, position, onClose]);

  if (!issue || !position) return null;

  // Adjust position to stay within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 100,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className={cn(
        'min-w-48 rounded-md border border-zinc-200 bg-white py-1 shadow-lg',
        'dark:border-zinc-700 dark:bg-zinc-800'
      )}
    >
      <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-700">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {issue.id}
        </div>
        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {issue.title}
        </div>
      </div>

      <button
        onClick={() => {
          onViewDetails?.(issue);
          onClose();
        }}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
          'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
        )}
      >
        <span className="w-4 text-center">👁</span>
        View details
      </button>

      <div className="border-t border-zinc-100 dark:border-zinc-700">
        <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Move to
        </div>
        {statusOptions
          .filter((s) => s.value !== issue.status)
          .map((status) => (
            <button
              key={status.value}
              onClick={() => {
                onStatusChange?.(issue, status.value);
                onClose();
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
            >
              <span className="w-4 text-center">→</span>
              {status.label}
            </button>
          ))}
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-700">
        <button
          onClick={() => {
            onAssign?.(issue);
            onClose();
          }}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
            'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
          )}
        >
          <span className="w-4 text-center">👤</span>
          Assign...
        </button>
      </div>
    </div>
  );
}
