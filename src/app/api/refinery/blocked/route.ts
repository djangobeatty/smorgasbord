/**
 * API Route: POST /api/refinery/blocked
 * Show blocked PRs in refinery for a specific rig
 * Executes: gt refinery blocked <rig>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGtWithAutoSync } from '@/lib/beads-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rig } = body;

    if (!rig || typeof rig !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid rig parameter' },
        { status: 400 }
      );
    }

    const sanitizedRig = rig.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedRig !== rig) {
      return NextResponse.json(
        { error: 'Invalid rig name' },
        { status: 400 }
      );
    }

    const { stdout, stderr } = await execGtWithAutoSync(
      `gt refinery blocked ${sanitizedRig}`,
      sanitizedRig
    );

    return NextResponse.json({
      success: true,
      rig: sanitizedRig,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error getting blocked refinery PRs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get blocked refinery PRs', details: message },
      { status: 500 }
    );
  }
}
