'use client';

import Link from 'next/link';
import { usePolecats, useRigs } from '@/lib/use-beads';
import { PolecatGrid } from '@/components/polecat';
import type { Polecat } from '@/types/beads';

export default function PolecatsPage() {
  const { polecats, isLoading: polecatsLoading, error: polecatsError } = usePolecats();
  const { rigs, isLoading: rigsLoading, error: rigsError } = useRigs();

  const isLoading = polecatsLoading || rigsLoading;
  const error = polecatsError || rigsError;

  const handleViewSession = (polecat: Polecat) => {
    console.log('View session:', polecat);
    // TODO: Implement session viewer
  };

  const handleNudge = (polecat: Polecat) => {
    console.log('Nudge:', polecat);
    // TODO: Implement nudge action
  };

  const handleNuke = (polecat: Polecat) => {
    console.log('Nuke:', polecat);
    // TODO: Implement nuke action
  };

  // Summary stats
  const totalPolecats = polecats.length;
  const activeCount = polecats.filter((p) => p.status === 'active').length;
  const idleCount = polecats.filter((p) => p.status === 'idle').length;
  const errorCount = polecats.filter((p) => p.status === 'error').length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-zinc-100">
            Gas Town Dashboard
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100"
            >
              Dashboard
            </Link>
            <Link
              href="/polecats"
              className="text-sm font-medium text-zinc-100"
            >
              Polecats
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">
              Polecat Status
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Monitor worker agents across all rigs
            </p>
          </div>

          {/* Summary Stats */}
          {!isLoading && !error && (
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-100">{totalPolecats}</p>
                <p className="text-zinc-500">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                <p className="text-zinc-500">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-400">{idleCount}</p>
                <p className="text-zinc-500">Idle</p>
              </div>
              {errorCount > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{errorCount}</p>
                  <p className="text-zinc-500">Error</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500">Loading polecats...</div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-400">Error loading data: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <PolecatGrid
            polecats={polecats}
            rigs={rigs}
            onViewSession={handleViewSession}
            onNudge={handleNudge}
            onNuke={handleNuke}
          />
        )}
      </main>
    </div>
  );
}
