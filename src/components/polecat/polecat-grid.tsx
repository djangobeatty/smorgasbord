'use client';

import { useMemo } from 'react';
import type { Polecat, Rig } from '@/types/beads';
import { RigSection } from './rig-section';

interface PolecatGridProps {
  polecats: Polecat[];
  rigs: Rig[];
  onViewSession?: (polecat: Polecat) => void;
  onNudge?: (polecat: Polecat) => void;
  onNuke?: (polecat: Polecat) => void;
}

export function PolecatGrid({
  polecats,
  rigs,
  onViewSession,
  onNudge,
  onNuke,
}: PolecatGridProps) {
  // Group polecats by rig
  const polecatsByRig = useMemo(() => {
    const grouped = new Map<string, Polecat[]>();

    // Initialize with empty arrays for each rig
    rigs.forEach((rig) => {
      grouped.set(rig.name, []);
    });

    // Group polecats
    polecats.forEach((polecat) => {
      const rigPolecats = grouped.get(polecat.rig) || [];
      rigPolecats.push(polecat);
      grouped.set(polecat.rig, rigPolecats);
    });

    return grouped;
  }, [polecats, rigs]);

  // Sort rigs: active first, then by name
  const sortedRigs = useMemo(() => {
    return [...rigs].sort((a, b) => {
      // Active rigs first
      if (a.state === 'active' && b.state !== 'active') return -1;
      if (a.state !== 'active' && b.state === 'active') return 1;
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }, [rigs]);

  if (rigs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No rigs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedRigs.map((rig) => (
        <RigSection
          key={rig.id}
          rig={rig}
          polecats={polecatsByRig.get(rig.name) || []}
          onViewSession={onViewSession}
          onNudge={onNudge}
          onNuke={onNuke}
        />
      ))}
    </div>
  );
}
