'use client';

import { useState } from 'react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Convoy, Issue } from '@/types/beads';
import { ConvoyStatusBadge } from './convoy-status-badge';
import { ProgressBar } from './progress-bar';

interface ConvoyDetailProps {
  convoy: Convoy;
  issues?: Issue[];
  onClose?: () => void;
  onNudge?: (convoy: Convoy) => void;
  onEscalate?: (convoy: Convoy, message?: string) => void;
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
    <div className="flex items-center justify-between p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/30 hover:bg-zinc-200 dark:hover:bg-zinc-900/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            'text-xs font-bold',
            priorityColors[issue.priority as keyof typeof priorityColors] ||
              'text-zinc-400'
          )}
        >
          P{issue.priority}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{issue.title}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{issue.id}</p>
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
  onEscalate,
}: ConvoyDetailProps) {
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateMessage, setEscalateMessage] = useState('');

  const handleEscalate = () => {
    onEscalate?.(convoy, escalateMessage.trim() || undefined);
    setShowEscalateModal(false);
    setEscalateMessage('');
  };

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
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {convoy.title}
            </h2>
            <ConvoyStatusBadge status={convoy.status} />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">{convoy.id}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
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
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Progress</h3>
        <ProgressBar
          completed={convoy.progress.completed}
          total={convoy.progress.total}
          size="lg"
        />
      </div>

      {/* Details Section */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Total Issues</span>
          <p className="text-zinc-900 dark:text-zinc-100">{convoy.issues.length}</p>
        </div>
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Created</span>
          <p className="text-zinc-700 dark:text-zinc-300">{formatRelativeTime(convoy.created_at)}</p>
        </div>
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Last Updated</span>
          <p className="text-zinc-700 dark:text-zinc-300">{formatRelativeTime(convoy.updated_at)}</p>
        </div>
      </div>

      {/* Issues Timeline */}
      <div className="p-4 max-h-80 overflow-y-auto">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Issues</h3>

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
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
            No issues found for this convoy
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        {convoy.status !== 'completed' && (
          <button
            onClick={() => onNudge?.(convoy)}
            className="w-full px-4 py-2 text-sm rounded bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 transition-colors"
          >
            Nudge Workers
          </button>
        )}
        <button
          onClick={() => setShowEscalateModal(true)}
          className="w-full px-4 py-2 text-sm rounded bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/50 text-amber-700 dark:text-amber-300 transition-colors font-medium"
        >
          🚨 Escalate to Mayor
        </button>
      </div>

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowEscalateModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Escalate to Mayor
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Convoy: {convoy.title}
            </p>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Optional Message
            </label>
            <textarea
              value={escalateMessage}
              onChange={(e) => setEscalateMessage(e.target.value)}
              placeholder="Add context about why this needs attention..."
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              rows={4}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleEscalate}
                className="flex-1 px-4 py-2 text-sm rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors font-medium"
              >
                Send Escalation
              </button>
              <button
                onClick={() => {
                  setShowEscalateModal(false);
                  setEscalateMessage('');
                }}
                className="flex-1 px-4 py-2 text-sm rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
