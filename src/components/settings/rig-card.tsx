'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { RigStatus } from '@/types/rigs';

interface RigCardProps {
  rig: RigStatus;
  onStart: (name: string) => Promise<void>;
  onPark: (name: string) => Promise<void>;
  onUnpark: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
}

export function RigCard({
  rig,
  onStart,
  onPark,
  onUnpark,
  onRemove,
}: RigCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setIsLoading(true);
    setLoadingAction(action);
    try {
      await fn();
    } catch (err) {
      console.error(`Failed to ${action} rig:`, err);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-all hover:shadow-sm',
        rig.running
          ? 'border-green-500/50 dark:border-green-500/30'
          : rig.parked
            ? 'border-amber-500/50 dark:border-amber-500/30'
            : 'border-border'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {rig.name}
            </h3>
            {rig.running && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">
                Running
              </span>
            )}
            {rig.parked && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
                Parked
              </span>
            )}
            {!rig.running && !rig.parked && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                Stopped
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate mt-1">
            {rig.prefix && <span className="mr-2">[{rig.prefix}]</span>}
            {rig.gitUrl}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Polecats: {rig.polecatCount}</span>
            <span>Crew: {rig.crewCount}</span>
            {rig.agents.length > 0 && (
              <span>Agents: {rig.agents.join(', ')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
        {!rig.running && !rig.parked && (
          <Button
            onClick={() => handleAction('start', () => onStart(rig.name))}
            disabled={isLoading}
            size="sm"
          >
            {loadingAction === 'start' ? 'Starting...' : 'Start'}
          </Button>
        )}

        {rig.parked ? (
          <Button
            onClick={() => handleAction('unpark', () => onUnpark(rig.name))}
            disabled={isLoading}
            variant="secondary"
            size="sm"
          >
            {loadingAction === 'unpark' ? 'Unparking...' : 'Unpark'}
          </Button>
        ) : (
          <Button
            onClick={() => handleAction('park', () => onPark(rig.name))}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {loadingAction === 'park' ? 'Parking...' : 'Park'}
          </Button>
        )}

        {!showRemoveConfirm ? (
          <Button
            onClick={() => setShowRemoveConfirm(true)}
            disabled={isLoading}
            variant="ghost"
            size="sm"
          >
            Remove
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button
              onClick={() => {
                handleAction('remove', () => onRemove(rig.name));
                setShowRemoveConfirm(false);
              }}
              disabled={isLoading}
              variant="destructive"
              size="sm"
            >
              {loadingAction === 'remove' ? 'Removing...' : 'Confirm'}
            </Button>
            <Button
              onClick={() => setShowRemoveConfirm(false)}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
