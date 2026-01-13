/**
 * API Route: DELETE /api/rigs/[name]
 * Remove a rig from the registry (does not delete files)
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    const { stdout, stderr } = await execGt(`gt rig remove ${name}`, {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      message: `Removed rig ${name} from registry`,
      stdout,
      stderr,
    });
  } catch (error) {
    console.error('Error removing rig:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove rig',
      },
      { status: 500 }
    );
  }
}
