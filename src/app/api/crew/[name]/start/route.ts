/**
 * API Route: POST /api/crew/[name]/start
 * Starts a stopped crew member
 * Executes: gt crew start <rig> <name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: crewName } = await params;

    // Get rig from request body
    let rig: string | undefined;
    try {
      const body = await request.json();
      rig = body.rig;
    } catch {
      // No body or invalid JSON, will try without rig
    }

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

    // Build command with rig if provided
    let command = 'gt crew start';
    if (rig) {
      const sanitizedRig = rig.replace(/[^a-zA-Z0-9_-]/g, '');
      if (sanitizedRig !== rig) {
        return NextResponse.json(
          { error: 'Invalid rig name' },
          { status: 400 }
        );
      }
      command += ` ${sanitizedRig}`;
    }
    command += ` ${sanitizedName}`;

    try {
      const { stdout, stderr } = await execGt(
        command,
        {
          timeout: 30000, // Starting can take time
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
      console.error('gt crew start command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if already running
      if (lowerError.includes('already running') || lowerError.includes('already exists')) {
        return NextResponse.json(
          {
            error: `Crew member ${crewName} is already running`,
            details: errorMsg,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to start crew member', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in crew start endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process start request' },
      { status: 500 }
    );
  }
}
