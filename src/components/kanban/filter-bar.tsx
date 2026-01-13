'use client';

import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useProjectMode } from '@/lib/project-mode';
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
  const { isBeadsOnly } = useProjectMode();

  const hasActiveFilters =
    selectedRig !== null ||
    selectedAssignee !== null ||
    selectedPriority !== null;

  const rigOptions = [
    { value: '', label: 'All rigs' },
    ...rigs.map((rig) => ({ value: rig, label: rig })),
  ];

  const assigneeOptions = [
    { value: '', label: 'All assignees' },
    ...assignees.map((assignee) => ({
      value: assignee,
      label: assignee.split('/').pop() || assignee,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Rig Filter - only show in Gas Town mode */}
      {!isBeadsOnly && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Rig
          </label>
          <Select
            value={selectedRig ?? ''}
            onChange={(value) => onRigChange(value || null)}
            options={rigOptions}
            placeholder="All rigs"
            className="w-32"
          />
        </div>
      )}

      {/* Assignee Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          Assignee
        </label>
        <Select
          value={selectedAssignee ?? ''}
          onChange={(value) => onAssigneeChange(value || null)}
          options={assigneeOptions}
          placeholder="All assignees"
          className="w-40"
        />
      </div>

      {/* Priority Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          Priority
        </label>
        <div className="flex gap-1">
          {priorities.map(({ value, label, color }) => (
            <Button
              key={value}
              variant={selectedPriority === value ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                onPriorityChange(selectedPriority === value ? null : value)
              }
              className={cn(
                'h-8 w-8 p-0',
                selectedPriority === value && cn(color, 'border-transparent hover:opacity-90')
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-8 text-xs"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
