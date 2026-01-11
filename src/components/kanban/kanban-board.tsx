'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Issue, IssueStatus, Priority } from '@/types/beads';
import { KanbanColumn } from './kanban-column';
import { FilterBar } from './filter-bar';
import { SearchBox } from './search-box';
import { IssueDetailModal } from './issue-detail-modal';
import { ContextMenu } from './context-menu';

interface KanbanBoardProps {
  issues: Issue[];
  onStatusChange?: (issue: Issue, newStatus: IssueStatus) => void;
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

export function KanbanBoard({ issues, onStatusChange }: KanbanBoardProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRig, setSelectedRig] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);

  // Drag state
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);

  // Modal state
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Context menu state
  const [contextMenuIssue, setContextMenuIssue] = useState<Issue | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Extract unique rigs and assignees
  const { rigs, assignees } = useMemo(() => {
    const rigSet = new Set<string>();
    const assigneeSet = new Set<string>();

    issues.forEach((issue) => {
      if (issue.assignee) {
        const rigMatch = issue.assignee.match(/^([^/]+)/);
        if (rigMatch) rigSet.add(rigMatch[1]);
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

      // Rig filter
      if (selectedRig) {
        const issueRig = issue.assignee?.match(/^([^/]+)/)?.[1];
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
      <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
        <span>
          Showing {filteredIssues.length} of {issues.filter(i => i.issue_type !== 'agent').length} issues
        </span>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            title={column.title}
            status={column.id}
            issues={issuesByColumn[column.id] || []}
            onIssueClick={setSelectedIssue}
            onIssueDragStart={handleDragStart}
            onIssueContextMenu={handleContextMenu}
            onDragOver={() => handleDragOver(column.id)}
            onDrop={handleDrop}
            isDropTarget={dropTargetColumn === column.id}
          />
        ))}
      </div>

      {/* Issue Detail Modal */}
      <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />

      {/* Context Menu */}
      <ContextMenu
        issue={contextMenuIssue}
        position={contextMenuPosition}
        onClose={handleCloseContextMenu}
        onStatusChange={handleStatusChangeFromMenu}
        onViewDetails={(issue) => setSelectedIssue(issue)}
      />
    </div>
  );
}
