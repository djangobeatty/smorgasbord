/**
 * API Route: /api/deacon/sweep
 * GET - Preview orphaned beads (dry-run)
 * POST - Close orphaned beads automatically
 *
 * Orphaned beads are hooked beads whose associated PRs have been merged
 * but the bead hasn't been closed yet.
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

interface OrphanedBead {
  id: string;
  title?: string;
  polecat?: string;
  rig?: string;
  reason: string;
}

interface SweepPreviewResponse {
  success: boolean;
  orphaned_beads: OrphanedBead[];
  summary: {
    total_orphaned: number;
    would_close: number;
  };
}

interface SweepExecuteResponse {
  success: boolean;
  action: 'sweep';
  closed_beads: OrphanedBead[];
  errors: Array<{ id: string; error: string }>;
  summary: {
    checked: number;
    closed: number;
    errors: number;
  };
}

/**
 * Parse output from gt orphans command
 * Expected format varies, but typically shows orphaned bead info
 */
function parseOrphansOutput(stdout: string): OrphanedBead[] {
  const orphans: OrphanedBead[] = [];
  const lines = stdout.split('\n').filter(line => line.trim());

  for (const line of lines) {
    // Try to parse bead ID from the line
    // Format may be: "gd-xxx: Title" or "gd-xxx (polecat: name)" etc.
    const idMatch = line.match(/^([a-z]+-[a-z0-9]+(?:\.[0-9]+)?)/i);
    if (idMatch) {
      const id = idMatch[1];
      // Extract title if present after colon
      const titleMatch = line.match(/:\s*(.+?)(?:\s*\(|$)/);
      const title = titleMatch ? titleMatch[1].trim() : undefined;
      // Extract polecat if mentioned
      const polecatMatch = line.match(/polecat[:\s]+([^\s,)]+)/i);
      const polecat = polecatMatch ? polecatMatch[1] : undefined;
      // Extract rig if mentioned
      const rigMatch = line.match(/rig[:\s]+([^\s,)]+)/i);
      const rig = rigMatch ? rigMatch[1] : undefined;

      orphans.push({
        id,
        title,
        polecat,
        rig,
        reason: 'Orphaned bead detected by gt orphans',
      });
    }
  }

  return orphans;
}

/**
 * GET /api/deacon/sweep
 * Preview orphaned beads without closing them (dry-run)
 */
export async function GET() {
  try {
    const basePath = process.env.GT_BASE_PATH ?? process.cwd();

    // Run gt orphans to find orphaned beads
    let orphans: OrphanedBead[] = [];
    try {
      const { stdout } = await execAsync('gt orphans', {
        cwd: basePath,
        timeout: 30000,
      });
      orphans = parseOrphansOutput(stdout);
    } catch (execError) {
      // gt orphans might not exist or return error if no orphans
      const error = execError as { stdout?: string; stderr?: string; code?: number };
      // If it has stdout, try to parse it anyway
      if (error.stdout) {
        orphans = parseOrphansOutput(error.stdout);
      }
      // If no output, return empty list (no orphans found)
    }

    const response: SweepPreviewResponse = {
      success: true,
      orphaned_beads: orphans,
      summary: {
        total_orphaned: orphans.length,
        would_close: orphans.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error previewing orphaned beads:', error);
    return NextResponse.json(
      { error: 'Failed to preview orphaned beads' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deacon/sweep
 * Execute sweep - close all orphaned beads
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dry_run = false } = body;

    const basePath = process.env.GT_BASE_PATH ?? process.cwd();
    const beadsPath = getBeadsPath();

    // First, get the list of orphaned beads
    let orphans: OrphanedBead[] = [];
    try {
      const { stdout } = await execAsync('gt orphans', {
        cwd: basePath,
        timeout: 30000,
      });
      orphans = parseOrphansOutput(stdout);
    } catch (execError) {
      const error = execError as { stdout?: string };
      if (error.stdout) {
        orphans = parseOrphansOutput(error.stdout);
      }
    }

    if (dry_run) {
      return NextResponse.json({
        success: true,
        action: 'sweep',
        dry_run: true,
        orphaned_beads: orphans,
        summary: {
          checked: orphans.length,
          would_close: orphans.length,
        },
      });
    }

    // Close each orphaned bead
    const closedBeads: OrphanedBead[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const orphan of orphans) {
      try {
        const command = `bd close ${orphan.id} --reason "Auto-closed by Deacon sweep: orphaned bead"`;
        await execAsync(command, {
          cwd: path.dirname(beadsPath),
          timeout: 10000,
        });
        closedBeads.push(orphan);
      } catch (closeError) {
        const error = closeError as { message?: string; stderr?: string };
        errors.push({
          id: orphan.id,
          error: error.stderr || error.message || 'Unknown error',
        });
      }
    }

    const response: SweepExecuteResponse = {
      success: errors.length === 0,
      action: 'sweep',
      closed_beads: closedBeads,
      errors,
      summary: {
        checked: orphans.length,
        closed: closedBeads.length,
        errors: errors.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error executing sweep:', error);
    return NextResponse.json(
      { error: 'Failed to execute sweep' },
      { status: 500 }
    );
  }
}
