/**
 * API Route: POST /api/rigs/[name]/park
 * Park a rig (stops agents, daemon won't auto-restart)
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    const { stdout, stderr } = await execGt(`gt rig park ${name}`, {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      message: `Parked rig ${name}`,
      stdout,
      stderr,
    });
  } catch (error) {
    console.error('Error parking rig:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to park rig',
      },
      { status: 500 }
    );
  }
}
