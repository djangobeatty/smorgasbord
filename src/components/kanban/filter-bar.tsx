'use client';

import { cn } from '@/lib/utils';
import type { Priority } from '@/types/beads';

interface FilterBarProps {
  rigs: string[];
  assignees: string[];
  selectedRig: string | null;
  selectedAssignee: string | null;
  selectedPriority: Priority | null;
  onRigChange: (rig: string | null) => void;
  onAssigneeChange: (assignee: string | null) => void;
  onPriorityChange: (priority: Priority | null) => void;
  onClearFilters: () => void;
}

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 0, label: 'P0', color: 'bg-red-500' },
  { value: 1, label: 'P1', color: 'bg-orange-500' },
  { value: 2, label: 'P2', color: 'bg-yellow-500' },
  { value: 3, label: 'P3', color: 'bg-blue-500' },
  { value: 4, label: 'P4', color: 'bg-gray-500' },
];

export function FilterBar({
  rigs,
  assignees,
  selectedRig,
  selectedAssignee,
  selectedPriority,
  onRigChange,
  onAssigneeChange,
  onPriorityChange,
  onClearFilters,
}: FilterBarProps) {
  const hasActiveFilters =
    selectedRig !== null ||
    selectedAssignee !== null ||
    selectedPriority !== null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Rig Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Rig
        </label>
        <select
          value={selectedRig ?? ''}
          onChange={(e) => onRigChange(e.target.value || null)}
          className={cn(
            'h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
          )}
        >
          <option value="">All rigs</option>
          {rigs.map((rig) => (
            <option key={rig} value={rig}>
              {rig}
            </option>
          ))}
        </select>
      </div>

      {/* Assignee Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Assignee
        </label>
        <select
          value={selectedAssignee ?? ''}
          onChange={(e) => onAssigneeChange(e.target.value || null)}
          className={cn(
            'h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
          )}
        >
          <option value="">All assignees</option>
          {assignees.map((assignee) => (
            <option key={assignee} value={assignee}>
              {assignee.split('/').pop()}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Priority
        </label>
        <div className="flex gap-1">
          {priorities.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() =>
                onPriorityChange(selectedPriority === value ? null : value)
              }
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-all',
                selectedPriority === value
                  ? cn(color, 'border-transparent text-white')
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="h-8 rounded-md px-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
