'use client';

import { useProjectMode } from '@/lib/project-mode';
import { NavBar } from '@/components/layout';

export default function Settings() {
  const { mode, activeProject, isLoading } = useProjectMode();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Configure your dashboard preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Project Mode Info */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Current Project
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Project mode determines which features are available
            </p>
            <div className="mt-4 space-y-3">
              {isLoading ? (
                <p className="text-sm text-zinc-500">Loading...</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Mode:
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      mode === 'gastown'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {mode === 'gastown' ? 'Gas Town (Full)' : 'Beads Only'}
                    </span>
                  </div>
                  {activeProject && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Project:
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {activeProject.name}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                    {mode === 'gastown'
                      ? 'All features enabled: Polecats, Witnesses, Refineries, Convoys, Control Plane'
                      : 'Limited features: Kanban board only. Gas Town features are hidden.'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Data Source */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Data Source
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Configure the beads API endpoint and refresh interval
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="refresh-interval"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  id="refresh-interval"
                  defaultValue={5}
                  min={1}
                  className="mt-1 block w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* Display */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Display
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Customize the dashboard appearance
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="show-completed"
                  defaultChecked
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
                />
                <label
                  htmlFor="show-completed"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Show completed items
                </label>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
