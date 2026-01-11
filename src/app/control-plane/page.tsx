import Link from 'next/link';
import { MayorPanel } from '@/components/control-plane';

export default function ControlPlanePage() {
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
              href="/control-plane"
              className="text-sm font-medium text-zinc-100"
            >
              Control Plane
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-100">
            Control Plane
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor and control Gas Town system components
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Mayor Panel */}
          <MayorPanel />

          {/* Placeholder for future panels */}
          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">Deacon</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-500/20 text-gray-400 border-gray-500/30">
                <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-400" />
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Deacon monitoring panel will be available here.
            </p>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">Witnesses</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-500/20 text-gray-400 border-gray-500/30">
                <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-400" />
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Per-rig Witness monitoring panel will be available here.
            </p>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">Refineries</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-500/20 text-gray-400 border-gray-500/30">
                <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-400" />
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Per-rig Refinery monitoring panel will be available here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
