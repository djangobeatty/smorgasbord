'use client';

import type { Issue, IssueStatus } from '@/types/beads';
import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  issue: Issue | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onStatusChange?: (issue: Issue, status: IssueStatus) => void;
  onViewDetails?: (issue: Issue) => void;
  onEscalate?: (issue: Issue) => void;
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
  onViewDetails,
  onEscalate,
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
      className="min-w-48 rounded-md border border-border bg-card py-1 shadow-lg"
    >
      <div className="border-b border-border px-3 py-2">
        <div className="text-xs text-muted-foreground font-mono">
          {issue.id}
        </div>
        <div className="truncate text-sm font-medium text-foreground">
          {issue.title}
        </div>
      </div>

      <button
        onClick={() => {
          onViewDetails?.(issue);
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
      >
        <span className="w-4 text-center">👁</span>
        View details
      </button>

      <div className="border-t border-border">
        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
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
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <span className="w-4 text-center">→</span>
              {status.label}
            </button>
          ))}
      </div>

      <div className="border-t border-border">
        <button
          onClick={() => {
            onEscalate?.(issue);
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-500 hover:bg-amber-500/10 font-medium"
        >
          <span className="w-4 text-center">🚨</span>
          Escalate to Mayor
        </button>
      </div>
    </div>
  );
}
