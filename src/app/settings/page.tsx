import Link from 'next/link';

export default function Settings() {
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
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Configure your Gas Town Dashboard preferences
          </p>
        </div>

        <div className="space-y-6">
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
