'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Convoy, Issue } from '@/types/beads';
import { ConvoyCard } from './convoy-card';

interface ConvoyListProps {
  convoys: Convoy[];
  issues?: Issue[];
  onSelectConvoy?: (convoy: Convoy) => void;
  onConvoyContextMenu?: (e: React.MouseEvent, convoy: Convoy) => void;
}

interface CollapsibleSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'warning' | 'muted';
}

function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = true,
  variant = 'default',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantStyles = {
    default: 'text-foreground',
    warning: 'text-amber-400',
    muted: 'text-muted-foreground',
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        <svg
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-90'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <h3
          className={cn(
            'text-sm font-semibold uppercase tracking-wide',
            variantStyles[variant]
          )}
        >
          {title}
        </h3>
        <span className="text-xs text-muted-foreground">({count})</span>
      </button>
      {isOpen && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>}
    </div>
  );
}

export function ConvoyList({ convoys, issues = [], onSelectConvoy, onConvoyContextMenu }: ConvoyListProps) {
  // Separate convoys by status
  const activeConvoys = convoys.filter((c) => c.status === 'active');
  const stalledConvoys = convoys.filter((c) => c.status === 'stalled');
  const completedConvoys = convoys.filter((c) => c.status === 'completed');

  // Always expand all sections - no auto-folding
  const shouldExpandActive = true;
  const shouldExpandStalled = true;
  const shouldExpandCompleted = true;

  if (convoys.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No convoys found</p>
      </div>
    );
  }

  return (
    <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      {/* Stalled convoys at top with warning highlight */}
      {stalledConvoys.length > 0 && (
        <CollapsibleSection
          title="Stalled"
          count={stalledConvoys.length}
          defaultOpen={shouldExpandStalled}
          variant="warning"
        >
          {stalledConvoys.map((convoy) => (
            <ConvoyCard
              key={convoy.id}
              convoy={convoy}
              issues={issues}
              onClick={onSelectConvoy}
              onContextMenu={onConvoyContextMenu}
            />
          ))}
        </CollapsibleSection>
      )}

      {/* Active convoys prominently displayed */}
      {activeConvoys.length > 0 && (
        <CollapsibleSection
          title="Active"
          count={activeConvoys.length}
          defaultOpen={shouldExpandActive}
        >
          {activeConvoys.map((convoy) => (
            <ConvoyCard
              key={convoy.id}
              convoy={convoy}
              issues={issues}
              onClick={onSelectConvoy}
              onContextMenu={onConvoyContextMenu}
            />
          ))}
        </CollapsibleSection>
      )}

      {/* Completed convoys in collapsible section */}
      {completedConvoys.length > 0 && (
        <CollapsibleSection
          title="Completed"
          count={completedConvoys.length}
          defaultOpen={shouldExpandCompleted}
          variant="muted"
        >
          {completedConvoys.map((convoy) => (
            <ConvoyCard
              key={convoy.id}
              convoy={convoy}
              issues={issues}
              onClick={onSelectConvoy}
              onContextMenu={onConvoyContextMenu}
            />
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}
