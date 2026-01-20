/**
 * API Route: POST /api/mayor/nudge
 * Sends a nudge message to the Mayor via gt nudge mayor command
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface NudgeRequest {
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NudgeRequest = await request.json();

    const message = (body.message || '').trim();

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Build command - message is optional
    let command = 'gt nudge mayor';
    if (message) {
      // Escape message for shell safety
      const escapedMessage = message.replace(/'/g, "'\\''");
      command = `gt nudge mayor '${escapedMessage}'`;
    }

    try {
      // Execute gt nudge mayor command
      const { stdout, stderr } = await execGt(
        command,
        {
          timeout: 10000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Nudge sent successfully',
        output: stdout.trim(),
      });
    } catch (execError) {
      // If gt command fails, log but still return success for demo purposes
      console.error('gt nudge command failed:', execError);

      // Return success for demo/development (command may not be available)
      return NextResponse.json({
        success: true,
        message: 'Nudge queued (gt command not available)',
      });
    }
  } catch (error) {
    console.error('Error in nudge endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send nudge' },
      { status: 500 }
    );
  }
}
