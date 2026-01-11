'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import type { Convoy, Issue } from '@/types/beads';
import { ConvoyStatusBadge } from './convoy-status-badge';
import { ProgressBar } from './progress-bar';

interface ConvoyDetailProps {
  convoy: Convoy;
  issues?: Issue[];
  onClose?: () => void;
  onNudge?: (convoy: Convoy) => void;
}

interface IssueItemProps {
  issue: Issue;
}

function IssueItem({ issue }: IssueItemProps) {
  const statusColors = {
    open: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    hooked: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    in_progress: 'text-green-400 bg-green-500/10 border-green-500/30',
    blocked: 'text-red-400 bg-red-500/10 border-red-500/30',
    closed: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  };

  const priorityColors = {
    0: 'text-red-400',
    1: 'text-orange-400',
    2: 'text-yellow-400',
    3: 'text-blue-400',
    4: 'text-gray-400',
  };

  return (
    <div className="flex items-center justify-between p-2 rounded border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            'text-xs font-bold',
            priorityColors[issue.priority as keyof typeof priorityColors] ||
              'text-gray-400'
          )}
        >
          P{issue.priority}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-white truncate">{issue.title}</p>
          <p className="text-xs text-gray-500 font-mono">{issue.id}</p>
        </div>
      </div>
      <span
        className={cn(
          'px-2 py-0.5 text-xs rounded border',
          statusColors[issue.status]
        )}
      >
        {issue.status}
      </span>
    </div>
  );
}

export function ConvoyDetail({
  convoy,
  issues = [],
  onClose,
  onNudge,
}: ConvoyDetailProps) {
  // Filter issues that belong to this convoy
  const convoyIssues = issues.filter((issue) =>
    convoy.issues.includes(issue.id)
  );

  // Separate by status for timeline view
  const completedIssues = convoyIssues.filter((i) => i.status === 'closed');
  const inProgressIssues = convoyIssues.filter(
    (i) => i.status === 'in_progress' || i.status === 'hooked'
  );
  const pendingIssues = convoyIssues.filter(
    (i) => i.status === 'open' || i.status === 'blocked'
  );

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-800">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-semibold text-white truncate">
              {convoy.title}
            </h2>
            <ConvoyStatusBadge status={convoy.status} />
          </div>
          <p className="text-sm text-gray-500 font-mono">{convoy.id}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Progress</h3>
        <ProgressBar
          completed={convoy.progress.completed}
          total={convoy.progress.total}
          size="lg"
        />
      </div>

      {/* Details Section */}
      <div className="p-4 border-b border-gray-800 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Assigned To</span>
          <p className="text-blue-400">{convoy.assignee || 'Unassigned'}</p>
        </div>
        <div>
          <span className="text-gray-500">Total Issues</span>
          <p className="text-white">{convoy.issues.length}</p>
        </div>
        <div>
          <span className="text-gray-500">Created</span>
          <p className="text-gray-300">{formatRelativeTime(convoy.created_at)}</p>
        </div>
        <div>
          <span className="text-gray-500">Last Updated</span>
          <p className="text-gray-300">{formatRelativeTime(convoy.updated_at)}</p>
        </div>
      </div>

      {/* Issues Timeline */}
      <div className="p-4 max-h-80 overflow-y-auto">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Issues</h3>

        {inProgressIssues.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-green-400 mb-2 uppercase tracking-wide">
              In Progress ({inProgressIssues.length})
            </p>
            <div className="space-y-2">
              {inProgressIssues.map((issue) => (
                <IssueItem key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {pendingIssues.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-blue-400 mb-2 uppercase tracking-wide">
              Pending ({pendingIssues.length})
            </p>
            <div className="space-y-2">
              {pendingIssues.map((issue) => (
                <IssueItem key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {completedIssues.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
              Completed ({completedIssues.length})
            </p>
            <div className="space-y-2">
              {completedIssues.map((issue) => (
                <IssueItem key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {convoyIssues.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No issues found for this convoy
          </p>
        )}
      </div>

      {/* Actions */}
      {convoy.status !== 'completed' && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => onNudge?.(convoy)}
            className="w-full px-4 py-2 text-sm rounded bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 transition-colors"
          >
            Nudge Worker
          </button>
        </div>
      )}
    </div>
  );
}
