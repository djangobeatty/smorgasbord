/**
 * API Route: POST /api/crew/[name]/remove
 * Removes a crew member workspace permanently
 * Executes: gt crew remove <name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface RemoveRequest {
  force?: boolean;
  rig?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: crewName } = await params;
    const body: RemoveRequest = await request.json().catch(() => ({}));

    if (!crewName) {
      return NextResponse.json(
        { error: 'Crew member name is required' },
        { status: 400 }
      );
    }

    // Sanitize input to prevent command injection
    const sanitizedName = crewName.replace(/[^a-zA-Z0-9_-]/g, '');

    if (sanitizedName !== crewName) {
      return NextResponse.json(
        { error: 'Invalid crew member name' },
        { status: 400 }
      );
    }

    try {
      const forceFlag = body.force ? ' --force' : '';
      // Use rig/name format if rig is provided
      const targetName = body.rig ? `${body.rig}/${sanitizedName}` : sanitizedName;
      const { stdout, stderr } = await execGt(
        `gt crew remove ${targetName}${forceFlag}`,
        {
          timeout: 20000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        }
      );

      return NextResponse.json({
        success: true,
        name: crewName,
        output: stdout,
        stderr: stderr || undefined,
      });
    } catch (execError) {
      console.error('gt crew remove command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if there are uncommitted changes or other issues
      if (
        lowerError.includes('uncommitted') ||
        lowerError.includes('unpushed') ||
        lowerError.includes('dirty') ||
        lowerError.includes('safety check')
      ) {
        return NextResponse.json(
          {
            error: `Cannot remove ${crewName}: workspace has uncommitted or unpushed changes`,
            details: errorMsg,
            canForce: true,
          },
          { status: 400 }
        );
      }

      // Check if not found
      if (lowerError.includes('not found') || lowerError.includes('does not exist')) {
        return NextResponse.json(
          {
            error: `Crew member ${crewName} not found`,
            details: errorMsg,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to remove crew member', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in crew remove endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process remove request' },
      { status: 500 }
    );
  }
}
