import Link from 'next/link';

export default function Dashboard() {
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
              href="/settings"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Work Status
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Kanban board for visualizing Gas Town work status
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {['Open', 'In Progress', 'Blocked', 'Closed'].map((status) => (
            <div
              key={status}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {status}
              </h3>
              <div className="space-y-3">
                <p className="text-center text-sm text-zinc-400 dark:text-zinc-600">
                  No items
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
