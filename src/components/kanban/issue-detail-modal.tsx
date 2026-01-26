'use client';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { Issue, Priority, IssueStatus, Comment } from '@/types/beads';
import { useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

interface IssueDetailModalProps {
  issue: Issue | null;
  onClose: () => void;
  onViewInKanban?: () => void;
  onUpdate?: (issue: Issue) => void;
  onOpenIssue?: (issueId: string) => void;
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

const statusOptions: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'hooked', label: 'Hooked' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'closed', label: 'Closed' },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 0, label: 'P0 - Critical' },
  { value: 1, label: 'P1 - High' },
  { value: 2, label: 'P2 - Medium' },
  { value: 3, label: 'P3 - Low' },
  { value: 4, label: 'P4 - Minimal' },
];

interface EditState {
  title: string;
  description: string;
  status: IssueStatus;
  priority: Priority;
  assignee: string;
  labels: string;
}

export function IssueDetailModal({ issue, onClose, onViewInKanban, onUpdate, onOpenIssue }: IssueDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    title: '',
    description: '',
    status: 'open',
    priority: 2,
    assignee: '',
    labels: '',
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Reset edit state and fetch comments when issue changes
  useEffect(() => {
    if (issue) {
      setEditState({
        title: issue.title,
        description: issue.description || '',
        status: issue.status,
        priority: issue.priority,
        assignee: issue.assignee || '',
        labels: issue.labels?.join(', ') || '',
      });
      setIsEditing(false);
      setError(null);

      // Fetch comments
      setLoadingComments(true);
      const rigParam = issue._rig ? `?rig=${encodeURIComponent(issue._rig)}` : '';
      fetch(`/api/beads/issues/${issue.id}/comments${rigParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setComments(data);
          } else {
            setComments([]);
          }
        })
        .catch(() => setComments([]))
        .finally(() => setLoadingComments(false));
    }
  }, [issue]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
          if (issue) {
            setEditState({
              title: issue.title,
              description: issue.description || '',
              status: issue.status,
              priority: issue.priority,
              assignee: issue.assignee || '',
              labels: issue.labels?.join(', ') || '',
            });
          }
        } else {
          onClose();
        }
      }
    },
    [onClose, isEditing, issue]
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

  const handleSave = async () => {
    if (!issue) return;
    setIsSaving(true);
    setError(null);

    try {
      const labelsArray = editState.labels
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const response = await fetch(`/api/beads/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editState.title !== issue.title ? editState.title : undefined,
          description: editState.description !== (issue.description || '') ? editState.description : undefined,
          status: editState.status !== issue.status ? editState.status : undefined,
          priority: editState.priority !== issue.priority ? editState.priority : undefined,
          assignee: editState.assignee !== (issue.assignee || '') ? editState.assignee : undefined,
          labels: editState.labels !== (issue.labels?.join(', ') || '') ? labelsArray : undefined,
          rig: issue._rig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to save');
      }

      setIsEditing(false);
      onUpdate?.({
        ...issue,
        title: editState.title,
        description: editState.description,
        status: editState.status,
        priority: editState.priority,
        assignee: editState.assignee,
        labels: labelsArray,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (issue) {
      setEditState({
        title: issue.title,
        description: issue.description || '',
        status: issue.status,
        priority: issue.priority,
        assignee: issue.assignee || '',
        labels: issue.labels?.join(', ') || '',
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (!issue) return null;

  const priority = priorityConfig[isEditing ? editState.priority : issue.priority];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={isEditing ? undefined : onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-card shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card p-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{issue.id}</span>
              <span>·</span>
              <span className="capitalize">{issue.issue_type}</span>
              {issue.parent && (
                <>
                  <span>·</span>
                  <button
                    onClick={() => onOpenIssue?.(issue.parent!)}
                    className="font-mono text-blue-500 hover:underline"
                  >
                    ↑ {issue.parent}
                  </button>
                </>
              )}
            </div>
            {isEditing ? (
              <Input
                value={editState.title}
                onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
                className="mt-1 text-xl font-semibold"
                placeholder="Issue title"
              />
            ) : (
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                {issue.title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                if (isEditing) {
                  handleCancel();
                } else {
                  onClose();
                }
              }}
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
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-destructive/10 border-b border-destructive/50 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 border-b border-border p-4 sm:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              Status
            </div>
            {isEditing ? (
              <Select
                value={editState.status}
                onChange={(value) => setEditState((s) => ({ ...s, status: value as IssueStatus }))}
                options={statusOptions}
                className="mt-1"
              />
            ) : (
              <div className="mt-1 text-sm font-medium text-foreground">
                {statusLabels[issue.status] || issue.status}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              Priority
            </div>
            {isEditing ? (
              <Select
                value={String(editState.priority)}
                onChange={(value) => setEditState((s) => ({ ...s, priority: Number(value) as Priority }))}
                options={priorityOptions.map((opt) => ({ value: String(opt.value), label: opt.label }))}
                className="mt-1"
              />
            ) : (
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={cn('h-2.5 w-2.5 rounded-full', priority.color)}
                />
                <span className="text-sm font-medium text-foreground">
                  {priority.label}
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              Assignee
            </div>
            {isEditing ? (
              <Input
                value={editState.assignee}
                onChange={(e) => setEditState((s) => ({ ...s, assignee: e.target.value }))}
                className="mt-1 h-8 text-sm"
                placeholder="Unassigned"
              />
            ) : (
              <div className="mt-1 text-sm text-foreground">
                {issue.assignee?.split('/').pop() || 'Unassigned'}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              Updated
            </div>
            <div className="mt-1 text-sm text-foreground">
              {formatRelativeTime(issue.updated_at)}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Description
          </div>
          {isEditing ? (
            <Textarea
              value={editState.description}
              onChange={(e) => setEditState((s) => ({ ...s, description: e.target.value }))}
              className="mt-2 min-h-[100px]"
              placeholder="Add a description..."
            />
          ) : (
            <div className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
              {issue.description || 'No description provided.'}
            </div>
          )}
        </div>

        {/* Acceptance Criteria */}
        {issue.acceptance_criteria && (
          <div className="border-t border-border p-4">
            <div className="text-xs font-medium text-muted-foreground">
              Acceptance Criteria
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
              {issue.acceptance_criteria}
            </div>
          </div>
        )}

        {/* Notes */}
        {issue.notes && (
          <div className="border-t border-border p-4">
            <div className="text-xs font-medium text-muted-foreground">
              Notes
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
              {issue.notes}
            </div>
          </div>
        )}

        {/* Comments */}
        {(comments.length > 0 || loadingComments) && (
          <div className="border-t border-border p-4">
            <div className="text-xs font-medium text-muted-foreground">
              Comments {comments.length > 0 && `(${comments.length})`}
            </div>
            {loadingComments ? (
              <div className="mt-2 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="mt-2 space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded bg-muted/50 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{comment.author}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(comment.created_at)}</span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">
                      {comment.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dependencies (read-only) */}
        {issue.dependencies && issue.dependencies.length > 0 && (
          <div className="border-t border-border p-4">
            <div className="text-xs font-medium text-muted-foreground">
              Dependencies ({issue.dependencies.length})
            </div>
            <div className="mt-2 space-y-1">
              {issue.dependencies.map((dep, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono">{dep.depends_on_id}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {dep.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Labels */}
        <div className="border-t border-border p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Labels
          </div>
          {isEditing ? (
            <Input
              value={editState.labels}
              onChange={(e) => setEditState((s) => ({ ...s, labels: e.target.value }))}
              className="mt-2 h-8 text-sm"
              placeholder="label1, label2, label3"
            />
          ) : issue.labels && issue.labels.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">No labels</div>
          )}
        </div>

        {/* Action Buttons */}
        {isEditing ? (
          <div className="border-t border-border p-4 flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        ) : onViewInKanban ? (
          <div className="border-t border-border p-4">
            <Button
              onClick={onViewInKanban}
              className="w-full"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Go to Bead
            </Button>
          </div>
        ) : null}

        {/* Footer metadata */}
        <div className="border-t border-border bg-muted/50 p-4 text-xs text-muted-foreground">
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
