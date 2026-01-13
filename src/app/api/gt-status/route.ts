/**
 * API Route: GET /api/gt-status
 * Returns full gt status output including all agents and rigs
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';
import type { GtStatusOutput, GtAgent, GtRig } from '@/types/gt-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { stdout, stderr } = await execGt('gt status --json', {
      timeout: 10000,
    });

    if (stderr) {
      console.warn('gt status stderr:', stderr);
    }

    // gt status --json returns full status with agents and rigs
    let agents: GtAgent[] = [];
    let rigs: GtRig[] = [];
    let name = 'Gas Town';

    try {
      const parsed = JSON.parse(stdout.trim() || '[]');

      // Handle both array format and object format
      if (Array.isArray(parsed)) {
        agents = parsed;
      } else if (parsed.agents) {
        agents = parsed.agents;
        name = parsed.name || name;
        // Include rigs data for crew members
        if (parsed.rigs) {
          rigs = parsed.rigs;
        }
      }
    } catch (parseError) {
      console.error('Failed to parse gt status output:', parseError);
      // Return empty agents on parse error
    }

    const response: GtStatusOutput = {
      name,
      agents,
      rigs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error running gt status:', error);
    return NextResponse.json(
      { error: 'Failed to get gt status', name: 'Gas Town', agents: [], rigs: [] },
      { status: 500 }
    );
  }
}
