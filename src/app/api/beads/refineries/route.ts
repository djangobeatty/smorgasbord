/**
 * API Route: GET /api/beads/refineries
 * Returns refinery status for all rigs in Gas Town
 * Includes merge queue depth and current PR being processed
 */

import { NextResponse } from 'next/server';
import { getBeadsReader } from '@/lib/beads-reader';
import type { Issue, Refinery, PullRequest, RefineryStatus, AgentState, RoleType } from '@/types/beads';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

interface GHPullRequest {
  number: number;
  title: string;
  headRefName: string;
  author: { login: string };
  createdAt: string;
  url: string;
}

function parseJsonl<T>(content: string): T[] {
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    })
    .filter((item): item is T => item !== null);
}

async function getPRsForRig(rigName: string): Promise<PullRequest[]> {
  try {
    // Use gh CLI to get open PRs from the rig's directory
    const basePath = process.env.GT_BASE_PATH ?? process.cwd();
    const rigPath = `${basePath}/${rigName}`;

    const { stdout } = await execAsync(
      `gh pr list --json number,title,headRefName,author,createdAt,url --limit 20`,
      { cwd: rigPath }
    );

    const ghPRs: GHPullRequest[] = JSON.parse(stdout || '[]');

    return ghPRs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      branch: pr.headRefName,
      author: pr.author.login,
      createdAt: pr.createdAt,
      url: pr.url,
    }));
  } catch (error) {
    console.error(`Error fetching PRs for ${rigName}:`, error);
    return [];
  }
}

function parseRefineryFromIssue(issue: Issue): Partial<Refinery> | null {
  if (issue.issue_type !== 'agent') return null;

  const desc = issue.description;
  const getField = (field: string): string | null => {
    const match = desc.match(new RegExp(`${field}:\\s*(.+)`));
    return match ? match[1].trim() : null;
  };

  const roleType = getField('role_type') as RoleType;
  if (roleType !== 'refinery') return null;

  const agentState = (getField('agent_state') as AgentState) ?? 'idle';

  // Map agent state to refinery status
  let status: RefineryStatus = 'idle';
  if (agentState === 'active') {
    status = 'processing';
  } else if (agentState === 'error') {
    status = 'error';
  } else if (agentState === 'idle') {
    status = 'idle';
  }

  return {
    id: issue.id,
    name: issue.title,
    rig: getField('rig') ?? '',
    status,
    agent_state: agentState,
  };
}

export async function GET() {
  try {
    const reader = getBeadsReader();
    const content = await reader.getIssuesRaw();
    const issues = parseJsonl<Issue>(content);
    const rigNames = await reader.getRigNames();

    // Extract refinery agents from issues
    const refineryPartials = issues
      .map((issue) => parseRefineryFromIssue(issue))
      .filter((r): r is Partial<Refinery> => r !== null);

    // Build refineries with PR data
    const refineries: Refinery[] = [];

    for (const rigName of rigNames) {
      // Find existing refinery agent for this rig
      const existingRefinery = refineryPartials.find((r) => r.rig === rigName);

      // Get PRs for this rig
      const prs = await getPRsForRig(rigName);
      const currentPR = prs.length > 0 ? prs[0] : null;
      const pendingPRs = prs.slice(1);

      const refinery: Refinery = {
        id: existingRefinery?.id ?? `refinery-${rigName}`,
        name: existingRefinery?.name ?? `${rigName} Refinery`,
        rig: rigName,
        status: existingRefinery?.status ?? (prs.length > 0 ? 'idle' : 'idle'),
        queueDepth: prs.length,
        currentPR,
        pendingPRs,
        lastProcessedAt: null,
        agent_state: existingRefinery?.agent_state ?? 'idle',
      };

      refineries.push(refinery);
    }

    return NextResponse.json({
      refineries,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching refineries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refineries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/beads/refineries
 * Trigger gt mq process for a specific rig
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rig, action } = body;

    if (!rig) {
      return NextResponse.json(
        { error: 'rig is required' },
        { status: 400 }
      );
    }

    if (action === 'process') {
      // Execute gt mq process
      const basePath = process.env.GT_BASE_PATH ?? process.cwd();
      const { stdout, stderr } = await execAsync(`gt mq process`, {
        cwd: `${basePath}/${rig}`,
      });

      return NextResponse.json({
        success: true,
        rig,
        action,
        output: stdout,
        error: stderr || null,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing refinery action:', error);
    return NextResponse.json(
      { error: 'Failed to process refinery action' },
      { status: 500 }
    );
  }
}
