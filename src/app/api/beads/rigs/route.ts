/**
 * API Route: GET /api/beads/rigs
 * Returns list of all rigs in Gas Town
 */

import { NextResponse } from 'next/server';
import { getBeadsReader } from '@/lib/beads-reader';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reader = getBeadsReader();
    const rigNames = await reader.getRigNames();

    return NextResponse.json({ rigs: rigNames });
  } catch (error) {
    console.error('Error fetching rigs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rigs' },
      { status: 500 }
    );
  }
}
