'use client';

import { useState } from 'react';
import { useFeature } from '@/lib/project-mode';
import { useCrewStatus } from '@/lib/use-crew';
import { NavBar } from '@/components/layout';
import { CrewPanel, CrewChat } from '@/components/crew';
import type { CrewMember } from '@/types/crew';

export default function CrewPage() {
  const hasCrew = useFeature('crew');
  const { sendMail } = useCrewStatus();
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);

  // Feature not available in current mode
  if (!hasCrew) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-xl font-semibold text-zinc-100">
              Crew Not Available
            </h2>
            <p className="mt-2 text-zinc-400">
              Crew management is only available in Gas Town mode.
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
          <h2 className="text-2xl font-bold text-zinc-100">Crew</h2>
          <p className="mt-1 text-sm text-zinc-400">
            View and communicate with crew members across all rigs
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Crew Panel - Member List */}
          <CrewPanel
            onSelectMember={setSelectedMember}
            selectedMemberId={selectedMember?.id}
          />

          {/* Crew Chat - Conversation View */}
          <CrewChat
            member={selectedMember}
            onSendMessage={sendMail}
            className="h-[500px]"
          />
        </div>
      </main>
    </div>
  );
}
