/**
 * API Route: GET /api/beads/issues/[id]/comments
 * Fetches comments for a bead using the bd CLI
 */

import { NextResponse } from 'next/server';
import path from 'path';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const rig = searchParams.get('rig');

    const basePath = process.env.GT_BASE_PATH ?? process.cwd();
    const workingDir = rig ? path.join(basePath, rig, '.beads') : basePath;

    const command = `bd comments ${id} --json`;
    const { stdout } = await execGt(command, { cwd: workingDir });

    const comments = JSON.parse(stdout || '[]');

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: errorMessage },
      { status: 500 }
    );
  }
}
