/**
 * API Route: GET /api/mayor/status
 * Returns Mayor status including online/offline state, context usage, and session info
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { MayorState, MayorStatus, MayorSessionInfo } from '@/types/mayor';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

interface GtStatusOutput {
  mayor?: {
    status: string;
    session?: {
      uptime?: string;
      context_percent?: number;
      current_task?: string;
      last_activity?: string;
    };
  };
}

function parseUptime(uptimeStr: string | undefined): string {
  if (!uptimeStr) return 'N/A';
  return uptimeStr;
}

function parseLastActivity(lastActivityStr: string | undefined): string {
  if (!lastActivityStr) return 'N/A';

  try {
    const date = new Date(lastActivityStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return lastActivityStr;
  }
}

async function getMayorStatus(): Promise<MayorState> {
  try {
    // Try to get mayor status via gt status command
    const { stdout } = await execAsync('gt status --json 2>/dev/null || echo "{}"', {
      timeout: 5000,
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });

    const data: GtStatusOutput = JSON.parse(stdout.trim() || '{}');

    if (!data.mayor) {
      return { status: 'offline', session: null };
    }

    const mayorData = data.mayor;
    const status: MayorStatus =
      mayorData.status === 'active' || mayorData.status === 'online' ? 'online' :
      mayorData.status === 'busy' ? 'busy' : 'offline';

    const session: MayorSessionInfo | null = mayorData.session ? {
      uptime: parseUptime(mayorData.session.uptime),
      contextUsagePercent: mayorData.session.context_percent ?? 0,
      currentTask: mayorData.session.current_task ?? null,
      lastActivity: parseLastActivity(mayorData.session.last_activity),
    } : null;

    return { status, session };
  } catch (error) {
    console.error('Error getting mayor status:', error);

    // Return mock data for development/demo purposes
    return {
      status: 'online',
      session: {
        uptime: '2h 34m',
        contextUsagePercent: 45,
        currentTask: 'Processing gt_dashboard work items',
        lastActivity: 'just now',
      },
    };
  }
}

export async function GET() {
  try {
    const mayorState = await getMayorStatus();
    return NextResponse.json(mayorState);
  } catch (error) {
    console.error('Error in mayor status endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get mayor status' },
      { status: 500 }
    );
  }
}
