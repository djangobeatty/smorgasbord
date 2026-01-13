/**
 * API Route: POST /api/rigs/[name]/unpark
 * Unpark a rig (allow daemon to auto-restart agents)
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

    const { stdout, stderr } = await execGt(`gt rig unpark ${name}`, {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      message: `Unparked rig ${name}`,
      stdout,
      stderr,
    });
  } catch (error) {
    console.error('Error unparking rig:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpark rig',
      },
      { status: 500 }
    );
  }
}
