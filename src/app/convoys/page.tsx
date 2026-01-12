'use client';

import { useState } from 'react';
import { useBeads } from '@/lib/use-beads';
import { useFeature } from '@/lib/project-mode';
import { ConvoyList, ConvoyDetail } from '@/components/convoy';
import { NavBar } from '@/components/layout';
import type { Convoy } from '@/types/beads';

export default function ConvoysPage() {
  const hasConvoys = useFeature('convoys');
  const { data, isLoading, error } = useBeads();
  const [selectedConvoy, setSelectedConvoy] = useState<Convoy | null>(null);

  const convoys = data?.convoys ?? [];
  const issues = data?.issues ?? [];

  const handleSelectConvoy = (convoy: Convoy) => {
    setSelectedConvoy(convoy);
  };

  const handleCloseDetail = () => {
    setSelectedConvoy(null);
  };

  const handleNudge = (convoy: Convoy) => {
    console.log('Nudge worker for convoy:', convoy.id);
    // TODO: Implement nudge action
  };

  // Summary stats
  const activeCount = convoys.filter((c) => c.status === 'active').length;
  const stalledCount = convoys.filter((c) => c.status === 'stalled').length;
  const completedCount = convoys.filter((c) => c.status === 'completed').length;

  // Calculate overall progress
  const totalIssues = convoys.reduce((sum, c) => sum + c.progress.total, 0);
  const completedIssues = convoys.reduce(
    (sum, c) => sum + c.progress.completed,
    0
  );
  const overallProgress =
    totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  // Feature not available in current mode
  if (!hasConvoys) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-xl font-semibold text-zinc-100">
              Convoys Not Available
            </h2>
            <p className="mt-2 text-zinc-400">
              Convoy tracking is only available in Gas Town mode.
              This project is running in beads-only mode.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Convoy Tracking</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Monitor active work streams and their progress
            </p>
          </div>

          {/* Summary Stats */}
          {!isLoading && !error && (
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-100">
                  {convoys.length}
                </p>
                <p className="text-zinc-500">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                <p className="text-zinc-500">Active</p>
              </div>
              {stalledCount > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {stalledCount}
                  </p>
                  <p className="text-zinc-500">Stalled</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">
                  {completedCount}
                </p>
                <p className="text-zinc-500">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {overallProgress}%
                </p>
                <p className="text-zinc-500">Progress</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500">Loading convoys...</div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-400">Error loading data: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Convoy List */}
            <div className="lg:col-span-2">
              <ConvoyList
                convoys={convoys}
                onSelectConvoy={handleSelectConvoy}
                onNudge={handleNudge}
              />
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selectedConvoy ? (
                <ConvoyDetail
                  convoy={selectedConvoy}
                  issues={issues}
                  onClose={handleCloseDetail}
                  onNudge={handleNudge}
                />
              ) : (
                <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-8 text-center">
                  <p className="text-zinc-500">
                    Select a convoy to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
