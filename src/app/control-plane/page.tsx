'use client';

import { useFeature } from '@/lib/project-mode';
import { ChatInterface } from '@/components/chat';
import { MayorPanel } from '@/components/control-plane';
import { NavBar } from '@/components/layout';

export default function ControlPlanePage() {
  const hasControlPlane = useFeature('controlPlane');

  // Feature not available in current mode
  if (!hasControlPlane) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-xl font-semibold text-zinc-100">
              Control Plane Not Available
            </h2>
            <p className="mt-2 text-zinc-400">
              The Control Plane is only available in Gas Town mode.
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

          {/* Chat Interface */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">Mayor Chat</h3>
            </div>
            <ChatInterface className="h-[400px]" />
          </div>

          {/* Deacon Panel Placeholder */}
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

          {/* Witnesses Panel Placeholder */}
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
        </div>
      </main>
    </div>
  );
}
