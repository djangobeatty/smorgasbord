'use client';

import Link from 'next/link';
import { useWitnesses, useRigs } from '@/lib/use-beads';
import { WitnessGrid } from '@/components/witness';
import type { Witness } from '@/types/beads';

export default function WitnessesPage() {
  const { witnesses, isLoading: witnessesLoading, error: witnessesError, refresh } = useWitnesses();
  const { rigs, isLoading: rigsLoading, error: rigsError } = useRigs();

  const isLoading = witnessesLoading || rigsLoading;
  const error = witnessesError || rigsError;

  const handleNudge = async (witness: Witness) => {
    try {
      const response = await fetch('/api/witness/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig: witness.rig }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error('Nudge failed:', result.error);
      } else {
        console.log('Nudge sent:', result);
        refresh();
      }
    } catch (err) {
      console.error('Nudge error:', err);
    }
  };

  const handleStart = async (witness: Witness) => {
    try {
      const response = await fetch('/api/witness/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig: witness.rig }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error('Start failed:', result.error);
      } else {
        console.log('Witness started:', result);
        refresh();
      }
    } catch (err) {
      console.error('Start error:', err);
    }
  };

  // Summary stats
  const totalWitnesses = witnesses.length;
  const activeCount = witnesses.filter((w) => w.status === 'active').length;
  const idleCount = witnesses.filter((w) => w.status === 'idle').length;
  const stoppedCount = witnesses.filter((w) => w.status === 'stopped').length;
  const errorCount = witnesses.filter((w) => w.status === 'error').length;
  const totalUnreadMail = witnesses.reduce((sum, w) => sum + w.unread_mail, 0);

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
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100"
            >
              Polecats
            </Link>
            <Link
              href="/witnesses"
              className="text-sm font-medium text-zinc-100"
            >
              Witnesses
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
              Witness Status
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Monitor witness agents across all rigs
            </p>
          </div>

          {/* Summary Stats */}
          {!isLoading && !error && (
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-100">{totalWitnesses}</p>
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
              {stoppedCount > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-400">{stoppedCount}</p>
                  <p className="text-zinc-500">Stopped</p>
                </div>
              )}
              {errorCount > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{errorCount}</p>
                  <p className="text-zinc-500">Error</p>
                </div>
              )}
              {totalUnreadMail > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{totalUnreadMail}</p>
                  <p className="text-zinc-500">Unread</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500">Loading witnesses...</div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-400">Error loading data: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <WitnessGrid
            witnesses={witnesses}
            onNudge={handleNudge}
            onStart={handleStart}
          />
        )}
      </main>
    </div>
  );
}
