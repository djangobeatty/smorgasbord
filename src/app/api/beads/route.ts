/**
 * API Route: GET /api/beads
 * Returns all beads data (issues, rigs) in a single response
 * Optimized for dashboard initial load
 */

import { NextResponse } from 'next/server';
import { getBeadsReader } from '@/lib/beads-reader';
import type { Issue, Rig, Polecat, Witness, Agent, RoleType, AgentState, RigState, Convoy, WitnessStatus } from '@/types/beads';

export const dynamic = 'force-dynamic';

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

function parseAgentFromIssue(issue: Issue): Agent | null {
  if (issue.issue_type !== 'agent') return null;

  const desc = issue.description;
  const getField = (field: string): string | null => {
    const match = desc.match(new RegExp(`${field}:\\s*(.+)`));
    return match ? match[1].trim() : null;
  };

  const hookBead = getField('hook_bead');
  const roleBead = getField('role_bead');

  return {
    id: issue.id,
    title: issue.title,
    role_type: (getField('role_type') as RoleType) ?? 'polecat',
    rig: getField('rig') ?? '',
    agent_state: (getField('agent_state') as AgentState) ?? 'idle',
    hook_bead: issue.hook_bead ?? (hookBead === 'null' ? null : hookBead),
    role_bead: issue.role_bead ?? (roleBead === 'null' ? null : roleBead),
    cleanup_status: getField('cleanup_status'),
    active_mr: getField('active_mr'),
    notification_level: getField('notification_level'),
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
}

function parseRigFromIssue(issue: Issue): Rig | null {
  if (!issue.labels?.includes('gt:rig')) return null;

  const desc = issue.description;
  const getField = (field: string): string | null => {
    const match = desc.match(new RegExp(`${field}:\\s*(.+)`));
    return match ? match[1].trim() : null;
  };

  return {
    id: issue.id,
    name: issue.title,
    repo: getField('repo') ?? '',
    prefix: getField('prefix') ?? '',
    state: (getField('state') as RigState) ?? 'active',
  };
}

/**
 * Derive convoys from feature/molecule issues
 * A convoy represents a work stream with multiple related issues
 */
function deriveConvoys(issues: Issue[], polecats: Polecat[]): Convoy[] {
  const convoys: Convoy[] = [];

  // Build a map of issue dependencies (what issues does each issue depend on)
  const dependencyMap = new Map<string, string[]>();
  for (const issue of issues) {
    if (issue.dependencies) {
      for (const dep of issue.dependencies) {
        // dep.issue_id depends on dep.depends_on_id
        const existing = dependencyMap.get(dep.depends_on_id) || [];
        existing.push(dep.issue_id);
        dependencyMap.set(dep.depends_on_id, existing);
      }
    }
  }

  // Find convoy root issues (features or molecules with dependents)
  const convoyRoots = issues.filter(
    (issue) =>
      (issue.issue_type === 'feature' || issue.issue_type === 'molecule') &&
      dependencyMap.has(issue.id)
  );

  for (const root of convoyRoots) {
    // Collect all issues in this convoy
    const convoyIssueIds = new Set<string>([root.id]);
    const dependents = dependencyMap.get(root.id) || [];
    for (const depId of dependents) {
      convoyIssueIds.add(depId);
    }

    // Get the actual issue objects
    const convoyIssues = issues.filter((i) => convoyIssueIds.has(i.id));

    // Calculate progress
    const completed = convoyIssues.filter((i) => i.status === 'closed').length;
    const total = convoyIssues.length;

    // Determine convoy status
    let status: Convoy['status'] = 'active';
    if (completed === total && total > 0) {
      status = 'completed';
    } else {
      // Check if stalled (no hooked issues and not completed)
      const hasHookedWork = convoyIssues.some((i) => i.status === 'hooked');
      const hasInProgress = convoyIssues.some((i) => i.status === 'in_progress');
      if (!hasHookedWork && !hasInProgress && completed < total) {
        // Check if last update was more than 30 minutes ago
        const lastUpdate = new Date(root.updated_at).getTime();
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        if (lastUpdate < thirtyMinutesAgo) {
          status = 'stalled';
        }
      }
    }

    // Find assignee from hooked polecat
    let assignee: string | undefined;
    const hookedIssue = convoyIssues.find((i) => i.status === 'hooked');
    if (hookedIssue) {
      // Find the polecat that has this issue hooked
      const assignedPolecat = polecats.find(
        (p) => p.hooked_work === hookedIssue.id
      );
      if (assignedPolecat) {
        assignee = assignedPolecat.name;
      } else if (hookedIssue.assignee) {
        assignee = hookedIssue.assignee;
      }
    }

    convoys.push({
      id: root.id,
      title: root.title,
      issues: Array.from(convoyIssueIds),
      status,
      progress: { completed, total },
      assignee,
      created_at: root.created_at,
      updated_at: root.updated_at,
    });
  }

  // Sort: stalled first, then active, then completed
  const statusOrder = { stalled: 0, active: 1, completed: 2 };
  convoys.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return convoys;
}

export async function GET() {
  try {
    const reader = getBeadsReader();
    const content = await reader.getIssuesRaw();
    const issues = parseJsonl<Issue>(content);

    // Extract rigs from issues
    const rigs: Rig[] = issues
      .filter((issue) => issue.labels?.includes('gt:rig'))
      .map((issue) => parseRigFromIssue(issue))
      .filter((rig): rig is Rig => rig !== null);

    // Extract polecats from agent issues
    const polecats: Polecat[] = issues
      .filter((issue) => issue.issue_type === 'agent')
      .map((issue) => parseAgentFromIssue(issue))
      .filter((agent): agent is Agent => agent !== null && agent.role_type === 'polecat')
      .map((agent) => ({
        id: agent.id,
        name: agent.title,
        rig: agent.rig,
        status: agent.agent_state,
        hooked_work: agent.hook_bead,
      }));

    // Extract witnesses from agent issues
    const witnesses: Witness[] = issues
      .filter((issue) => issue.issue_type === 'agent')
      .map((issue) => parseAgentFromIssue(issue))
      .filter((agent): agent is Agent => agent !== null && agent.role_type === 'witness')
      .map((agent) => {
        const desc = issues.find((i) => i.id === agent.id)?.description ?? '';
        const getField = (field: string): string | null => {
          const match = desc.match(new RegExp(`${field}:\\s*(.+)`));
          return match ? match[1].trim() : null;
        };
        const unreadMailStr = getField('unread_mail');
        const lastCheck = getField('last_check');
        const statusStr = getField('witness_status') ?? agent.agent_state;

        // Map agent state to witness status
        let witnessStatus: WitnessStatus = 'idle';
        if (statusStr === 'active') witnessStatus = 'active';
        else if (statusStr === 'error') witnessStatus = 'error';
        else if (statusStr === 'stopped' || statusStr === 'done') witnessStatus = 'stopped';

        return {
          id: agent.id,
          rig: agent.rig,
          status: witnessStatus,
          last_check: lastCheck ?? agent.updated_at,
          unread_mail: unreadMailStr ? parseInt(unreadMailStr, 10) : 0,
        };
      });

    // Filter out agent issues from the main issues list for cleaner display
    const workIssues = issues.filter(
      (issue) => issue.issue_type !== 'agent' && !issue.labels?.includes('gt:rig')
    );

    // Derive convoys from feature/molecule issues with dependencies
    const convoys = deriveConvoys(issues, polecats);

    return NextResponse.json({
      issues: workIssues,
      rigs,
      polecats,
      witnesses,
      convoys,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching beads data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beads data' },
      { status: 500 }
    );
  }
}
