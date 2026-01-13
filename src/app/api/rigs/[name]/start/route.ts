/**
 * API Route: POST /api/rigs/[name]/start
 * Start a rig's agents (witness and refinery)
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

    const { stdout, stderr } = await execGt(`gt rig start ${name}`, {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      message: `Started rig ${name}`,
      stdout,
      stderr,
    });
  } catch (error) {
    console.error('Error starting rig:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start rig',
      },
      { status: 500 }
    );
  }
}
