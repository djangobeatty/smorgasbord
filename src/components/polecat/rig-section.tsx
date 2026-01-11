'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Polecat, Rig } from '@/types/beads';
import { PolecatCard } from './polecat-card';

interface RigSectionProps {
  rig: Rig;
  polecats: Polecat[];
  defaultExpanded?: boolean;
  onViewSession?: (polecat: Polecat) => void;
  onNudge?: (polecat: Polecat) => void;
  onNuke?: (polecat: Polecat) => void;
}

export function RigSection({
  rig,
  polecats,
  defaultExpanded = true,
  onViewSession,
  onNudge,
  onNuke,
}: RigSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const activeCount = polecats.filter((p) => p.status === 'active').length;
  const errorCount = polecats.filter((p) => p.status === 'error').length;

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/30 hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={cn(
              'w-4 h-4 text-gray-500 transition-transform',
              isExpanded && 'rotate-90'
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
          <div className="text-left">
            <h2 className="font-semibold text-white">{rig.name}</h2>
            <p className="text-xs text-gray-500 font-mono">{rig.prefix}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{polecats.length} polecats</span>
            {activeCount > 0 && (
              <span className="text-green-400">{activeCount} active</span>
            )}
            {errorCount > 0 && (
              <span className="text-red-400">{errorCount} error</span>
            )}
          </div>

          {/* Rig state indicator */}
          <span
            className={cn('w-2 h-2 rounded-full', {
              'bg-green-400': rig.state === 'active',
              'bg-gray-500': rig.state === 'inactive',
              'bg-orange-400': rig.state === 'archived',
            })}
          />
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-gray-950/50">
          {polecats.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No polecats in this rig
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {polecats.map((polecat) => (
                <PolecatCard
                  key={polecat.id}
                  polecat={polecat}
                  onViewSession={onViewSession}
                  onNudge={onNudge}
                  onNuke={onNuke}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
