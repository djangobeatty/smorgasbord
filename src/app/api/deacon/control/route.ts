/**
 * API Route: POST /api/deacon/control
 * Controls the deacon (daemon) - start/stop
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

function getBeadsPath(): string {
  return process.env.BEADS_PATH ?? path.join(process.cwd(), '..', '..', '..', '.beads');
}

interface ControlRequest {
  action: 'start' | 'stop' | 'restart';
}

interface ControlResponse {
  success: boolean;
  action: string;
  message: string;
  output?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ControlRequest = await request.json();
    const { action } = body;

    if (!action || !['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be start, stop, or restart' },
        { status: 400 }
      );
    }

    const beadsPath = getBeadsPath();
    const dbPath = path.join(beadsPath, 'beads.db');

    let command: string;
    switch (action) {
      case 'start':
        command = `bd daemon --start --db "${dbPath}"`;
        break;
      case 'stop':
        command = `bd daemon --stop --db "${dbPath}"`;
        break;
      case 'restart':
        command = `bd daemon restart --db "${dbPath}"`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const response: ControlResponse = {
      success: false,
      action,
      message: '',
    };

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: path.dirname(beadsPath),
        timeout: 10000, // 10 second timeout
      });

      response.success = true;
      response.message = `Deacon ${action} command executed successfully`;
      response.output = stdout || stderr || '';
    } catch (execError) {
      const error = execError as { stdout?: string; stderr?: string; message?: string };
      // Some commands exit with non-zero but are still successful
      // e.g., stop when already stopped
      response.success = false;
      response.message = `Deacon ${action} command failed`;
      response.error = error.stderr || error.message || 'Unknown error';
      response.output = error.stdout || '';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error controlling deacon:', error);
    return NextResponse.json(
      { error: 'Failed to control deacon' },
      { status: 500 }
    );
  }
}
