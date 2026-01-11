'use client';

import type { Witness } from '@/types/beads';
import { WitnessCard } from './witness-card';

interface WitnessGridProps {
  witnesses: Witness[];
  onNudge?: (witness: Witness) => void;
  onStart?: (witness: Witness) => void;
}

export function WitnessGrid({ witnesses, onNudge, onStart }: WitnessGridProps) {
  if (witnesses.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No witnesses found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {witnesses.map((witness) => (
        <WitnessCard
          key={witness.id}
          witness={witness}
          onNudge={onNudge}
          onStart={onStart}
        />
      ))}
    </div>
  );
}
