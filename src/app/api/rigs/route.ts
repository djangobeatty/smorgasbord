/**
 * API Route: GET /api/rigs - List all rigs
 * API Route: POST /api/rigs - Add a new rig
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt, getResolvedGtRoot } from '@/lib/exec-gt';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { RigStatus, RigsRegistry } from '@/types/rigs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const gtBasePath = getResolvedGtRoot();
    if (!gtBasePath) {
      return NextResponse.json(
        { rigs: [], error: 'GT_BASE_PATH not configured. Set it in Settings.' },
        { status: 503 }
      );
    }
    const rigsJsonPath = join(gtBasePath, 'mayor', 'rigs.json');

    // Read rigs registry
    let registry: RigsRegistry;
    try {
      const data = await readFile(rigsJsonPath, 'utf-8');
      registry = JSON.parse(data);
    } catch (err) {
      console.error('Failed to read rigs.json:', err);
      return NextResponse.json({ rigs: [], error: 'Failed to read rigs registry' });
    }

    // Get status info from gt rig list
    let rigListOutput = '';
    try {
      const { stdout } = await execGt('gt rig list 2>/dev/null', { timeout: 5000 });
      rigListOutput = stdout;
    } catch (err) {
      console.error('Failed to run gt rig list:', err);
    }

    // Parse rig list output to get polecat/crew counts
    const rigStats: Record<string, { polecats: number; crew: number; agents: string[] }> = {};
    const rigBlocks = rigListOutput.split(/\n\n+/).filter(Boolean);
    for (const block of rigBlocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        const nameLine = lines[0].trim();
        const statsLine = lines[1].trim();
        const agentsLine = lines[2]?.trim() || '';

        // Parse "Polecats: X  Crew: Y"
        const polecatsMatch = statsLine.match(/Polecats:\s*(\d+)/);
        const crewMatch = statsLine.match(/Crew:\s*(\d+)/);
        // Parse "Agents: [refinery witness mayor]"
        const agentsMatch = agentsLine.match(/Agents:\s*\[([^\]]*)\]/);

        if (nameLine && !nameLine.startsWith('Rigs in')) {
          rigStats[nameLine] = {
            polecats: polecatsMatch ? parseInt(polecatsMatch[1], 10) : 0,
            crew: crewMatch ? parseInt(crewMatch[1], 10) : 0,
            agents: agentsMatch ? agentsMatch[1].split(/\s+/).filter(Boolean) : [],
          };
        }
      }
    }

    // Get detailed status for each rig to determine parked/docked state
    const rigStatuses: Record<string, { parked: boolean; docked: boolean; running: boolean }> = {};
    for (const rigName of Object.keys(registry.rigs)) {
      try {
        const { stdout } = await execGt(`gt rig status ${rigName} 2>/dev/null`, { timeout: 5000 });
        const statusMatch = stdout.match(/Status:\s*(PARKED|DOCKED|RUNNING|STOPPED)/i);
        if (statusMatch) {
          const status = statusMatch[1].toUpperCase();
          rigStatuses[rigName] = {
            parked: status === 'PARKED',
            docked: status === 'DOCKED',
            running: status === 'RUNNING',
          };
        } else {
          // Default to checking if agents are present
          rigStatuses[rigName] = {
            parked: false,
            docked: false,
            running: rigStats[rigName]?.agents.length > 0,
          };
        }
      } catch {
        rigStatuses[rigName] = {
          parked: false,
          docked: false,
          running: rigStats[rigName]?.agents.length > 0,
        };
      }
    }

    // Build response
    const rigs: RigStatus[] = Object.entries(registry.rigs).map(([name, config]) => {
      const stats = rigStats[name] || { polecats: 0, crew: 0, agents: [] };
      const status = rigStatuses[name] || { parked: false, docked: false, running: false };
      return {
        name,
        gitUrl: config.git_url,
        prefix: config.beads.prefix,
        addedAt: config.added_at,
        polecatCount: stats.polecats,
        crewCount: stats.crew,
        agents: stats.agents,
        running: status.running,
        parked: status.parked,
        docked: status.docked,
      };
    });

    return NextResponse.json({ rigs });
  } catch (error) {
    console.error('Error fetching rigs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rigs', rigs: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, gitUrl, prefix } = body;

    if (!name || !gitUrl) {
      return NextResponse.json(
        { success: false, error: 'Name and gitUrl are required' },
        { status: 400 }
      );
    }

    // Validate name (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Name must be alphanumeric (underscores and hyphens allowed)' },
        { status: 400 }
      );
    }

    // Build command
    let cmd = `gt rig add ${name} ${gitUrl}`;
    if (prefix) {
      cmd += ` --prefix ${prefix}`;
    }

    const { stdout, stderr } = await execGt(cmd, {
      timeout: 120000, // 2 minutes - cloning can take a while
    });

    return NextResponse.json({
      success: true,
      message: `Added rig ${name}`,
      stdout,
      stderr,
    });
  } catch (error) {
    console.error('Error adding rig:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add rig',
      },
      { status: 500 }
    );
  }
}
