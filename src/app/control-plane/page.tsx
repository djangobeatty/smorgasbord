import { ChatInterface } from '@/components/chat';
import Link from 'next/link';

export default function ControlPlanePage() {
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
              href="/polecats"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Polecats
            </Link>
            <Link
              href="/control-plane"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
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

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Control Plane
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Communicate with Mayor to coordinate work
          </p>
        </div>

        <ChatInterface className="h-[600px]" />
      </main>
    </div>
  );
}
