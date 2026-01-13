/**
 * API Route: POST /api/crew/add
 * Create a new crew workspace
 * Executes: gt crew add <name> [--rig <rig>] [--branch]
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface AddCrewRequest {
  name: string;
  rig: string;
  branch?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: AddCrewRequest = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Crew name is required' },
        { status: 400 }
      );
    }

    if (!body.rig || typeof body.rig !== 'string') {
      return NextResponse.json(
        { error: 'Rig is required' },
        { status: 400 }
      );
    }

    // Validate name - alphanumeric, underscores, hyphens only
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    if (!nameRegex.test(body.name)) {
      return NextResponse.json(
        { error: 'Crew name must start with a letter and contain only letters, numbers, underscores, and hyphens' },
        { status: 400 }
      );
    }

    // Build command
    let command = `gt crew add ${body.name} --rig ${body.rig}`;

    if (body.branch) {
      command += ' --branch';
    }

    const { stdout, stderr } = await execGt(command, {
      timeout: 60000, // 60 seconds - cloning can take a while
    });

    return NextResponse.json({
      success: true,
      name: body.name,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error adding crew member:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for common error patterns
    if (message.includes('already exists')) {
      return NextResponse.json(
        { error: `Crew workspace '${message}' already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add crew member', details: message },
      { status: 500 }
    );
  }
}
