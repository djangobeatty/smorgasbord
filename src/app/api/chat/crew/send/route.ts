/**
 * API Route: POST /api/chat/crew/send
 * Sends a message to a crew member via gt mail send
 *
 * Address format: <rig>/crew/<name>
 * Example: greenplace/crew/max
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface SendRequest {
  rig: string;
  name: string;
  message: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rig, name, message } = body as SendRequest;

    if (!rig || typeof rig !== 'string') {
      return NextResponse.json(
        { error: 'rig is required' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    // Sanitize rig and name to prevent command injection
    const sanitizedRig = rig.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '');

    if (sanitizedRig !== rig) {
      return NextResponse.json(
        { error: 'Invalid rig name' },
        { status: 400 }
      );
    }

    if (sanitizedName !== name) {
      return NextResponse.json(
        { error: 'Invalid crew name' },
        { status: 400 }
      );
    }

    // Build the correct crew address: <rig>/crew/<name>
    const target = `${sanitizedRig}/crew/${sanitizedName}`;

    // Escape the message for shell safety
    const escapedMessage = message.replace(/'/g, "'\\''");

    // Use gt mail send for proper mail delivery
    const command = `gt mail send ${target} '${escapedMessage}'`;

    const basePath = process.env.GT_BASE_PATH ?? process.cwd();

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        cwd: basePath,
      });

      return NextResponse.json({
        success: true,
        target,
        output: stdout || undefined,
      });
    } catch (cmdError) {
      console.error('gt mail send command failed:', cmdError);
      const error = cmdError as { stderr?: string; message?: string };
      return NextResponse.json(
        {
          error: 'Failed to send message to crew member',
          details: error.stderr || error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
