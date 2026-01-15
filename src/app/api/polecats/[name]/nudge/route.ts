/**
 * API Route: POST /api/polecats/[name]/nudge
 * Sends a nudge message to a polecat
 * Executes: gt nudge <rig>/<name> -m <message>
 * Message is optional - empty nudge defaults to "nudge"
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface NudgeRequest {
  message?: string;  // Optional - empty nudge is valid
  rig: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: polecatName } = await params;
    const body: NudgeRequest = await request.json();

    if (!polecatName) {
      return NextResponse.json(
        { error: 'Polecat name is required' },
        { status: 400 }
      );
    }

    if (!body.rig || typeof body.rig !== 'string') {
      return NextResponse.json(
        { error: 'Rig is required' },
        { status: 400 }
      );
    }

    // Default to "nudge" if message is empty
    const message = (body.message || '').trim() || 'nudge';

    // Sanitize inputs to prevent command injection
    const sanitizedRig = body.rig.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedName = polecatName.replace(/[^a-zA-Z0-9_-]/g, '');

    if (sanitizedRig !== body.rig || sanitizedName !== polecatName) {
      return NextResponse.json(
        { error: 'Invalid rig or polecat name' },
        { status: 400 }
      );
    }

    // Escape message for shell safety
    const escapedMessage = message.replace(/'/g, "'\\''");

    try {
      const { stdout, stderr } = await execGt(
        `gt nudge ${sanitizedRig}/${sanitizedName} -m '${escapedMessage}'`,
        {
          timeout: 10000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        }
      );

      return NextResponse.json({
        success: true,
        name: polecatName,
        rig: body.rig,
        output: stdout,
        stderr: stderr || undefined,
      });
    } catch (execError) {
      console.error('gt nudge command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if error is due to polecat not running (done status)
      if (
        lowerError.includes('no session') ||
        lowerError.includes('not found') ||
        lowerError.includes('does not exist')
      ) {
        return NextResponse.json(
          {
            error: `Polecat ${polecatName} is not running. Cannot send nudge to stopped polecats.`,
            details: errorMsg,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to nudge polecat', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in polecat nudge endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process nudge request' },
      { status: 500 }
    );
  }
}
