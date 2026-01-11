'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useIssues } from '@/lib/use-beads';
import { KanbanBoard } from '@/components/kanban';
import { RefineriesPanel } from '@/components/refinery';
import { DeaconPanel } from '@/components/deacon';
import type { Issue, IssueStatus } from '@/types/beads';

export default function Dashboard() {
  const { issues, isLoading, error, refresh } = useIssues();

  const handleStatusChange = useCallback(
    async (issue: Issue, newStatus: IssueStatus) => {
      // For now, just log the change - actual API integration would go here
      console.log(`Status change: ${issue.id} from ${issue.status} to ${newStatus}`);
      // In a real implementation, this would:
      // 1. Call an API to update the issue status
      // 2. Then refresh() to get updated data
      // await fetch(`/api/beads/issues/${issue.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      // refresh();
    },
    []
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Gas Town Dashboard
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Dashboard
            </Link>
            <Link
              href="/polecats"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Polecats
            </Link>
            <Link
              href="/convoys"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Convoys
            </Link>
            <Link
              href="/witnesses"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Witnesses
            </Link>
            <Link
              href="/control-plane"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Control Plane
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Refineries Panel */}
        <div className="mb-8">
          <RefineriesPanel />
        </div>

        {/* Work Status Kanban */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Control Plane
          </h2>
          <DeaconPanel />
        </div>

        {/* Work Status Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Work Status
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Kanban board for visualizing Gas Town work status
            </p>
          </div>
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            Error loading issues: {error.message}
          </div>
        )}

        {isLoading && issues.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-8 w-8 animate-spin text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Loading issues...
              </p>
            </div>
          </div>
        ) : (
          <KanbanBoard issues={issues} onStatusChange={handleStatusChange} />
        )}
      </main>
    </div>
  );
}
