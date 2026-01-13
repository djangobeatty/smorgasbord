/**
 * API Route: PATCH /api/beads/issues/[id]
 * Updates a bead's fields using the bd CLI
 */

import { NextResponse } from 'next/server';
import path from 'path';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface UpdateFields {
  title?: string;
  description?: string;
  priority?: number;
  assignee?: string;
  status?: string;
  labels?: string[];
  due?: string;
  estimate?: number;
  type?: string;
  rig?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateFields = await request.json();
    const { rig, ...updates } = body;

    const basePath = process.env.GT_BASE_PATH ?? process.cwd();
    const workingDir = rig ? path.join(basePath, rig, '.beads') : basePath;

    // Build bd update command with flags
    const args: string[] = [id];

    if (updates.title !== undefined) {
      args.push('--title', `"${updates.title.replace(/"/g, '\\"')}"`);
    }
    if (updates.description !== undefined) {
      args.push('-d', `"${updates.description.replace(/"/g, '\\"')}"`);
    }
    if (updates.priority !== undefined) {
      args.push('-p', String(updates.priority));
    }
    if (updates.assignee !== undefined) {
      args.push('-a', updates.assignee || '""');
    }
    if (updates.status !== undefined) {
      args.push('-s', updates.status);
    }
    if (updates.labels !== undefined) {
      // Use --set-labels to replace all labels
      if (updates.labels.length === 0) {
        args.push('--set-labels', '""');
      } else {
        for (const label of updates.labels) {
          args.push('--set-labels', label);
        }
      }
    }
    if (updates.due !== undefined) {
      args.push('--due', updates.due || '""');
    }
    if (updates.estimate !== undefined) {
      args.push('-e', String(updates.estimate));
    }
    if (updates.type !== undefined) {
      args.push('-t', updates.type);
    }

    const command = `bd update ${args.join(' ')}`;
    const { stdout, stderr } = await execGt(command, { cwd: workingDir });

    return NextResponse.json({
      success: true,
      id,
      updates,
      output: stdout || null,
      warning: stderr || null,
    });
  } catch (error) {
    console.error('Error updating bead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const stderr = (error as { stderr?: string })?.stderr;
    return NextResponse.json(
      {
        error: 'Failed to update bead',
        details: stderr || errorMessage,
      },
      { status: 500 }
    );
  }
}
