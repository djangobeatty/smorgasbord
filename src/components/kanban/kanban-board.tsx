'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Issue, IssueStatus, Priority } from '@/types/beads';
import { KanbanColumn } from './kanban-column';
import { FilterBar } from './filter-bar';
import { SearchBox } from './search-box';
import { ContextMenu } from './context-menu';
import { AlertModal } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ColumnPaginationData {
  total?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

interface KanbanBoardProps {
  issues: Issue[];
  onStatusChange?: (issue: Issue, newStatus: IssueStatus) => void;
  highlightedIssueId?: string | null;
  selectedIssue?: Issue | null;
  onSelectIssue?: (issue: Issue | null) => void;
  columnPagination?: Record<string, ColumnPaginationData>;
}

// Map statuses to columns
const statusColumnMap: Record<IssueStatus, string> = {
  open: 'open',
  hooked: 'in_progress',
  in_progress: 'in_progress',
  blocked: 'blocked',
  closed: 'closed',
};

const columns = [
  { id: 'open', title: 'Open', statuses: ['open'] as IssueStatus[] },
  { id: 'in_progress', title: 'In Progress', statuses: ['hooked', 'in_progress'] as IssueStatus[] },
  { id: 'blocked', title: 'Blocked', statuses: ['blocked'] as IssueStatus[] },
  { id: 'closed', title: 'Closed', statuses: ['closed'] as IssueStatus[] },
];

export function KanbanBoard({ issues, onStatusChange, highlightedIssueId, selectedIssue, onSelectIssue, columnPagination }: KanbanBoardProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRig, setSelectedRig] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);

  // Drag state
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);

  // Context menu state
  const [contextMenuIssue, setContextMenuIssue] = useState<Issue | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Escalation modal state
  const [escalateIssue, setEscalateIssue] = useState<Issue | null>(null);
  const [escalateMessage, setEscalateMessage] = useState('');

  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  // Extract unique rigs and assignees
  const { rigs, assignees } = useMemo(() => {
    const rigSet = new Set<string>();
    const assigneeSet = new Set<string>();

    issues.forEach((issue) => {
      // Use _rig field if available (added by beads-reader)
      if (issue._rig) {
        rigSet.add(issue._rig);
      } else if (issue.assignee) {
        // Fall back to extracting from assignee
        const rigMatch = issue.assignee.match(/^([^/]+)/);
        if (rigMatch) rigSet.add(rigMatch[1]);
      }
      if (issue.assignee) {
        assigneeSet.add(issue.assignee);
      }
    });

    return {
      rigs: Array.from(rigSet).sort(),
      assignees: Array.from(assigneeSet).sort(),
    };
  }, [issues]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Exclude agent issues from kanban
      if (issue.issue_type === 'agent') return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          issue.id.toLowerCase().includes(query) ||
          issue.title.toLowerCase().includes(query) ||
          issue.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Rig filter - use _rig field added by beads-reader, fall back to extracting from assignee
      if (selectedRig) {
        const issueRig = issue._rig || issue.assignee?.match(/^([^/]+)/)?.[1];
        if (issueRig !== selectedRig) return false;
      }

      // Assignee filter
      if (selectedAssignee && issue.assignee !== selectedAssignee) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== null && issue.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [issues, searchQuery, selectedRig, selectedAssignee, selectedPriority]);

  // Group issues by column
  const issuesByColumn = useMemo(() => {
    const grouped: Record<string, Issue[]> = {
      open: [],
      in_progress: [],
      blocked: [],
      closed: [],
    };

    filteredIssues.forEach((issue) => {
      const columnId = statusColumnMap[issue.status] || 'open';
      grouped[columnId].push(issue);
    });

    // Sort by priority within each column
    Object.values(grouped).forEach((columnIssues) => {
      columnIssues.sort((a, b) => a.priority - b.priority);
    });

    return grouped;
  }, [filteredIssues]);

  // Handlers
  const handleDragStart = useCallback((e: React.DragEvent, issue: Issue) => {
    setDraggedIssue(issue);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', issue.id);
  }, []);

  const handleDragOver = useCallback((columnId: string) => {
    setDropTargetColumn(columnId);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      setDropTargetColumn(null);

      if (!draggedIssue) return;

      // Map column to status
      const statusMap: Record<string, IssueStatus> = {
        open: 'open',
        in_progress: 'in_progress',
        blocked: 'blocked',
        closed: 'closed',
      };

      const newStatus = statusMap[columnId];
      if (newStatus && newStatus !== draggedIssue.status) {
        onStatusChange?.(draggedIssue, newStatus);
      }

      setDraggedIssue(null);
    },
    [draggedIssue, onStatusChange]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, issue: Issue) => {
    e.preventDefault();
    setContextMenuIssue(issue);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuIssue(null);
    setContextMenuPosition(null);
  }, []);

  const handleStatusChangeFromMenu = useCallback(
    (issue: Issue, status: IssueStatus) => {
      onStatusChange?.(issue, status);
    },
    [onStatusChange]
  );

  const clearFilters = useCallback(() => {
    setSelectedRig(null);
    setSelectedAssignee(null);
    setSelectedPriority(null);
    setSearchQuery('');
  }, []);

  const handleEscalateFromMenu = useCallback((issue: Issue) => {
    setEscalateIssue(issue);
  }, []);

  const handleSendEscalation = useCallback(async () => {
    if (!escalateIssue) return;

    try {
      const response = await fetch(`/api/beads/issues/${escalateIssue.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: escalateMessage.trim() || undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to escalate issue:', errorData);
        setAlertModal({
          title: 'Escalation Failed',
          message: errorData.error || 'Unknown error',
          variant: 'error',
        });
        return;
      }

      const result = await response.json();
      console.log('Escalate result:', result);
      setAlertModal({
        title: 'Issue Escalated',
        message: result.message || `Escalated issue "${escalateIssue.title}" to mayor`,
        variant: 'success',
      });

      setEscalateIssue(null);
      setEscalateMessage('');
    } catch (error) {
      console.error('Error escalating issue:', error);
      setAlertModal({
        title: 'Escalation Failed',
        message: 'Failed to escalate issue. Check console for details.',
        variant: 'error',
      });
    }
  }, [escalateIssue, escalateMessage]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:w-64"
        />
        <FilterBar
          rigs={rigs}
          assignees={assignees}
          selectedRig={selectedRig}
          selectedAssignee={selectedAssignee}
          selectedPriority={selectedPriority}
          onRigChange={setSelectedRig}
          onAssigneeChange={setSelectedAssignee}
          onPriorityChange={setSelectedPriority}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing {filteredIssues.length} of {issues.filter(i => i.issue_type !== 'agent').length} issues
        </span>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => {
          const pagination = columnPagination?.[column.id];
          return (
            <KanbanColumn
              key={column.id}
              title={column.title}
              status={column.id}
              issues={issuesByColumn[column.id] || []}
              total={pagination?.total}
              hasMore={pagination?.hasMore}
              isLoadingMore={pagination?.isLoadingMore}
              onLoadMore={pagination?.onLoadMore}
              onIssueClick={onSelectIssue}
              onIssueDragStart={handleDragStart}
              onIssueContextMenu={handleContextMenu}
              onDragOver={() => handleDragOver(column.id)}
              onDrop={handleDrop}
              isDropTarget={dropTargetColumn === column.id}
              highlightedIssueId={highlightedIssueId}
            />
          );
        })}
      </div>

      {/* Context Menu */}
      <ContextMenu
        issue={contextMenuIssue}
        position={contextMenuPosition}
        onClose={handleCloseContextMenu}
        onStatusChange={handleStatusChangeFromMenu}
        onViewDetails={onSelectIssue}
        onEscalate={handleEscalateFromMenu}
      />

      {/* Escalation Modal */}
      {escalateIssue && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setEscalateIssue(null);
            setEscalateMessage('');
          }}
        >
          <div
            className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Escalate to Mayor
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              Issue: {escalateIssue.title}
            </p>
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              {escalateIssue.id}
            </p>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Optional Message
            </label>
            <Textarea
              value={escalateMessage}
              onChange={(e) => setEscalateMessage(e.target.value)}
              placeholder="Add context about why this needs attention..."
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSendEscalation}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                Send Escalation
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEscalateIssue(null);
                  setEscalateMessage('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}
