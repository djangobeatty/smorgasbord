/**
 * API Route: PATCH /api/beads/issues/[id]/status
 * Updates the status of a bead using the bd CLI
 */

import { NextResponse } from 'next/server';
import path from 'path';
import type { IssueStatus } from '@/types/beads';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

const validStatuses: IssueStatus[] = ['open', 'hooked', 'in_progress', 'blocked', 'closed'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reason, rig } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const basePath = process.env.GT_BASE_PATH ?? process.cwd();

    // If rig is provided, run bd from that rig's .beads directory
    // This is needed for multi-rig setups where beads exist in different rig databases
    const workingDir = rig ? path.join(basePath, rig, '.beads') : basePath;

    let command: string;

    // Map status to bd CLI commands
    if (status === 'closed') {
      command = reason ? `bd close ${id} --reason "${reason}"` : `bd close ${id}`;
    } else if (status === 'open') {
      command = `bd reopen ${id}`;
    } else {
      // Use bd update --status for hooked, in_progress, blocked
      command = `bd update ${id} --status ${status}`;
    }

    const { stdout, stderr } = await execGt(command, { cwd: workingDir });

    return NextResponse.json({
      success: true,
      id,
      status,
      output: stdout || null,
      error: stderr || null,
    });
  } catch (error) {
    console.error('Error updating bead status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Extract stderr from exec error if available
    const stderr = (error as { stderr?: string })?.stderr;
    return NextResponse.json(
      {
        error: 'Failed to update bead status',
        details: stderr || errorMessage,
      },
      { status: 500 }
    );
  }
}
