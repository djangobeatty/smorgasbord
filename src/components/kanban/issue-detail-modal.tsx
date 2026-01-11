'use client';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { Issue, Priority } from '@/types/beads';
import { useEffect, useCallback } from 'react';

interface IssueDetailModalProps {
  issue: Issue | null;
  onClose: () => void;
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  0: { label: 'P0 - Critical', color: 'bg-red-500' },
  1: { label: 'P1 - High', color: 'bg-orange-500' },
  2: { label: 'P2 - Medium', color: 'bg-yellow-500' },
  3: { label: 'P3 - Low', color: 'bg-blue-500' },
  4: { label: 'P4 - Minimal', color: 'bg-gray-500' },
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  hooked: 'Hooked',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  closed: 'Closed',
};

export function IssueDetailModal({ issue, onClose }: IssueDetailModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (issue) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [issue, handleKeyDown]);

  if (!issue) return null;

  const priority = priorityConfig[issue.priority];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl',
          'dark:bg-zinc-900'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-mono">{issue.id}</span>
              <span>·</span>
              <span className="capitalize">{issue.issue_type}</span>
            </div>
            <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {issue.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Status
            </div>
            <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {statusLabels[issue.status] || issue.status}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Priority
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn('h-2.5 w-2.5 rounded-full', priority.color)}
              />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {priority.label}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Assignee
            </div>
            <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {issue.assignee?.split('/').pop() || 'Unassigned'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Updated
            </div>
            <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {formatRelativeTime(issue.updated_at)}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-4">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Description
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {issue.description || 'No description provided.'}
          </div>
        </div>

        {/* Dependencies */}
        {issue.dependencies && issue.dependencies.length > 0 && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Dependencies ({issue.dependencies.length})
            </div>
            <div className="mt-2 space-y-1">
              {issue.dependencies.map((dep, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <span className="text-zinc-400">→</span>
                  <span className="font-mono">{dep.depends_on_id}</span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                    {dep.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Labels */}
        {issue.labels && issue.labels.length > 0 && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Labels
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer metadata */}
        <div className="border-t border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          <div className="flex flex-wrap gap-4">
            <span>Created by {issue.created_by}</span>
            <span>·</span>
            <span>Created {formatRelativeTime(issue.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
