'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import type { Convoy, Issue } from '@/types/beads';
import { ConvoyStatusBadge } from './convoy-status-badge';
import { ProgressBar } from './progress-bar';
import { Button } from '@/components/ui/button';

interface ConvoyDetailModalProps {
  convoy: Convoy | null;
  issues?: Issue[];
  onClose: () => void;
  onNudge?: (convoy: Convoy) => void;
  onEscalate?: (convoy: Convoy) => void;
  onIssueClick?: (issue: Issue) => void;
}

interface IssueItemProps {
  issue: Issue;
  onClick?: (issue: Issue) => void;
}

function IssueItem({ issue, onClick }: IssueItemProps) {
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
    <div
      className="flex items-center justify-between p-2 rounded border border-border bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
      onClick={() => onClick?.(issue)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            'text-xs font-bold',
            priorityColors[issue.priority as keyof typeof priorityColors] ||
              'text-muted-foreground'
          )}
        >
          P{issue.priority}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">{issue.title}</p>
          <p className="text-xs text-muted-foreground font-mono">{issue.id}</p>
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

export function ConvoyDetailModal({
  convoy,
  issues = [],
  onClose,
  onNudge,
  onEscalate,
  onIssueClick,
}: ConvoyDetailModalProps) {
  if (!convoy) return null;

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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-foreground truncate">
                {convoy.title}
              </h2>
              <ConvoyStatusBadge status={convoy.status} />
            </div>
            <p className="text-sm text-muted-foreground font-mono">{convoy.id}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
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
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Progress Section */}
          <div className="p-6 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Progress</h3>
            <ProgressBar
              completed={convoy.progress.completed}
              total={convoy.progress.total}
              size="lg"
            />
          </div>

          {/* Details Section */}
          <div className="p-6 border-b border-border grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Assigned To</span>
              <p className="text-blue-400 mt-1">{convoy.assignee || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Issues</span>
              <p className="text-foreground mt-1">{convoy.issues.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <p className="text-foreground mt-1">{formatRelativeTime(convoy.created_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated</span>
              <p className="text-foreground mt-1">{formatRelativeTime(convoy.updated_at)}</p>
            </div>
          </div>

          {/* Issues Timeline */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Issues</h3>

            {inProgressIssues.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-green-400 mb-2 uppercase tracking-wide">
                  In Progress ({inProgressIssues.length})
                </p>
                <div className="space-y-2">
                  {inProgressIssues.map((issue) => (
                    <IssueItem key={issue.id} issue={issue} onClick={onIssueClick} />
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
                    <IssueItem key={issue.id} issue={issue} onClick={onIssueClick} />
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
                    <IssueItem key={issue.id} issue={issue} onClick={onIssueClick} />
                  ))}
                </div>
              </div>
            )}

            {convoyIssues.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No issues found for this convoy
              </p>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-2">
          {convoy.status !== 'completed' && (
            <Button
              variant="outline"
              onClick={() => {
                onNudge?.(convoy);
                onClose();
              }}
            >
              Nudge Workers
            </Button>
          )}
          <Button
            onClick={() => {
              onEscalate?.(convoy);
              onClose();
            }}
            className="bg-amber-500 hover:bg-amber-600"
          >
            Escalate to Mayor
          </Button>
        </div>
      </div>
    </div>
  );
}
