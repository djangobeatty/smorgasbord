/**
 * API Route: GET /api/beads
 * Returns all beads data (issues, rigs) in a single response
 * Optimized for dashboard initial load
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getBeadsReader } from '@/lib/beads-reader';
import { getGtStatus, execGt, getResolvedGtRoot } from '@/lib/exec-gt';
import type { Issue, Rig, Polecat, Witness, Agent, RoleType, AgentState, RigState, Convoy, WitnessStatus, Refinery, RefineryStatus, QueueItem, PullRequest } from '@/types/beads';

// Type for rigs.json registry
interface RigsRegistry {
  version: number;
  rigs: Record<string, {
    git_url: string;
    added_at: string;
    beads: {
      repo: string;
      prefix: string;
    };
  }>;
}

export const dynamic = 'force-dynamic';

// Cache for beads data to avoid expensive recomputation on every request
interface BeadsCache {
  data: {
    issues: Issue[];
    rigs: Rig[];
    polecats: Polecat[];
    witnesses: Witness[];
    refineries: Refinery[];
    convoys: Convoy[];
    timestamp: string;
  };
  timestamp: number;
}
let beadsCache: BeadsCache | null = null;
const BEADS_CACHE_TTL = 30000; // 30 second TTL - convoys are expensive to fetch

// Types for gt status --json response
interface GtStatusAgent {
  name: string;
  address: string;
  session: string;
  role: string;
  running: boolean;
  has_work: boolean;
  unread_mail: number;
  first_subject?: string;
}

interface GtStatusRig {
  name: string;
  polecats: string[];
  polecat_count: number;
  has_witness: boolean;
  has_refinery: boolean;
  agents: GtStatusAgent[];
}

interface GtStatusOutput {
  name: string;
  location: string;
  rigs: GtStatusRig[];
}

/**
 * Fetch convoys from gt convoy list --json with full details
 * Uses cached convoy data as fallback when detail fetches fail
 */
async function fetchConvoys(cachedConvoys?: Convoy[]): Promise<Convoy[]> {
  // Build lookup map from cached convoys for fallback
  const cachedConvoyMap = new Map<string, Convoy>();
  if (cachedConvoys) {
    for (const c of cachedConvoys) {
      cachedConvoyMap.set(c.id, c);
    }
  }
  try {
    const { stdout } = await execGt('gt convoy list --all --json', {
      timeout: 5000, // Reduced from 10s
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });
    if (!stdout) return [];

    const convoyList = JSON.parse(stdout.trim());
    if (!Array.isArray(convoyList)) return [];

    // Limit to top 20 convoys to avoid excessive API calls
    const limitedConvoys = convoyList.slice(0, 20);

    // Fetch full details for each convoy in parallel
    const convoyDetailsPromises = limitedConvoys.map(async (c: any) => {
      try {
        const { stdout: detailStdout } = await execGt(`gt convoy status ${c.id} --json`, {
          timeout: 8000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        });

        const details = JSON.parse(detailStdout.trim());

        // Map tracked issues to issue IDs
        const issueIds = details.tracked?.map((t: any) => t.id) || [];

        // Determine convoy status
        let status: Convoy['status'] = 'active';
        if (details.status === 'closed' || c.status === 'closed') {
          status = 'completed';
        } else if (details.total === 0 || !details.tracked || details.tracked.length === 0) {
          // Empty convoy or no tracked issues = stalled
          status = 'stalled';
        }

        return {
          id: c.id,
          title: c.title,
          issues: issueIds,
          status,
          progress: {
            completed: details.completed || 0,
            total: details.total || 0
          },
          created_at: c.created_at,
          updated_at: c.updated_at || c.created_at,
        };
      } catch (error) {
        console.error(`Error fetching convoy details for ${c.id}:`, error);
        // If details fetch fails, try to use cached convoy data
        const cached = cachedConvoyMap.get(c.id);
        if (cached && cached.issues.length > 0) {
          console.log(`[Convoy ${c.id}] Using cached data with ${cached.issues.length} issues`);
          return {
            ...cached,
            title: c.title, // Use fresh title in case it changed
            updated_at: c.updated_at || cached.updated_at,
          };
        }
        // No cache available, return minimal data
        return {
          id: c.id,
          title: c.title,
          issues: [],
          status: 'active' as const,
          progress: { completed: 0, total: 0 },
          created_at: c.created_at,
          updated_at: c.updated_at || c.created_at,
        };
      }
    });

    const convoys = await Promise.all(convoyDetailsPromises);

    // Sort: stalled first, then active, then completed
    const statusOrder = { stalled: 0, active: 1, completed: 2 };
    convoys.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return convoys;
  } catch (error) {
    console.error('Error fetching convoys:', error);
    return [];
  }
}

/**
 * Fetch queue items for a refinery using JSON output
 */
async function fetchRefineryQueue(rigName: string): Promise<QueueItem[]> {
  try {
    const { stdout } = await execGt(`gt refinery queue ${rigName} --json`, {
      timeout: 5000,
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });
    if (!stdout || stdout.trim() === '') return [];
    const data = JSON.parse(stdout);
    if (!Array.isArray(data)) return [];
    return data.map((item: { mr: { id: string; branch: string; issue_id: string; status: string }; age: string }) => ({
      id: item.mr.issue_id,
      title: `${item.mr.branch} (${item.mr.issue_id})`,
      branch: item.mr.branch,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch current PR status for a refinery
 */
async function fetchRefineryStatus(rigName: string): Promise<PullRequest | null> {
  try {
    const { stdout } = await execGt(`gt refinery status ${rigName}`, {
      timeout: 5000,
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });
    if (!stdout || stdout.trim() === '') return null;
    // Try to parse PR info from status output
    // Look for patterns like "Processing PR #123" or "branch: feature/foo"
    const prMatch = stdout.match(/PR\s*#?(\d+)/i) || stdout.match(/pull[_\s]?request[:\s]+#?(\d+)/i);
    const branchMatch = stdout.match(/branch[:\s]+([a-zA-Z0-9_/-]+)/i);
    const titleMatch = stdout.match(/title[:\s]+(.+?)(?:\n|$)/i);

    if (prMatch) {
      return {
        number: parseInt(prMatch[1], 10),
        title: titleMatch?.[1]?.trim() || '',
        branch: branchMatch?.[1] || '',
        author: '',
        createdAt: '',
        url: '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch witnesses, polecats, and refineries from gt status --json
 */
async function fetchGtStatus(): Promise<{ witnesses: Witness[]; polecatsFromGt: Polecat[]; refineries: Refinery[] }> {
  const witnesses: Witness[] = [];
  const polecatsFromGt: Polecat[] = [];
  const refineries: Refinery[] = [];

  try {
    const gtStatus = await getGtStatus<GtStatusOutput>();

    if (!gtStatus) {
      return { witnesses, polecatsFromGt, refineries };
    }

    // Collect rig names that have refineries for queue depth lookup
    const refineryRigs: string[] = [];

    if (gtStatus.rigs) {
      for (const rig of gtStatus.rigs) {
        if (rig.agents) {
          for (const agent of rig.agents) {
            if (agent.role === 'witness') {
              // Map running/has_work to witness status
              let status: WitnessStatus = 'idle';
              if (agent.running && agent.has_work) {
                status = 'active';
              } else if (!agent.running) {
                status = 'stopped';
              }

              witnesses.push({
                id: agent.address,
                rig: rig.name,
                status,
                last_check: new Date().toISOString(),
                unread_mail: agent.unread_mail || 0,
              });
            } else if (agent.role === 'polecat') {
              // Map running status to AgentState: spawning | active | idle | done | error
              const polecatStatus: AgentState = agent.running
                ? (agent.has_work ? 'active' : 'idle')
                : 'done'; // 'done' for stopped polecats

              polecatsFromGt.push({
                id: agent.address,
                name: agent.name,
                rig: rig.name,
                status: polecatStatus,
                hooked_work: agent.has_work ? 'work' : null,
                unread_mail: agent.unread_mail || 0,
              });
            } else if (agent.role === 'refinery') {
              // Map running/has_work to refinery status
              let status: RefineryStatus = 'idle';
              if (agent.running && agent.has_work) {
                status = 'processing';
              } else if (agent.running) {
                status = 'active';
              }

              refineryRigs.push(rig.name);
              refineries.push({
                id: agent.address,
                name: agent.name,
                rig: rig.name,
                status,
                queueDepth: 0, // Will be populated below
                queueItems: [], // Will be populated below
                currentPR: null, // Will be populated below
                pendingPRs: [],
                lastProcessedAt: null,
                agent_state: agent.running ? (agent.has_work ? 'active' : 'idle') : 'done',
                unread_mail: agent.unread_mail || 0,
              });
            }
          }
        }
      }
    }

    // Fetch queue items and status for all refineries in parallel
    if (refineries.length > 0) {
      const queuePromises = refineries.map(r => fetchRefineryQueue(r.rig));
      const statusPromises = refineries.map(r => fetchRefineryStatus(r.rig));
      const [queues, statuses] = await Promise.all([
        Promise.all(queuePromises),
        Promise.all(statusPromises),
      ]);
      for (let i = 0; i < refineries.length; i++) {
        refineries[i].queueItems = queues[i];
        refineries[i].queueDepth = queues[i].length;
        refineries[i].currentPR = statuses[i];
      }
    }
  } catch (error) {
    console.error('Failed to fetch gt status:', error);
  }

  return { witnesses, polecatsFromGt, refineries };
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
 * Fetch rigs from mayor/rigs.json (canonical source)
 */
async function fetchRigsFromRegistry(): Promise<Rig[]> {
  try {
    const gtBasePath = getResolvedGtRoot();
    if (!gtBasePath) {
      console.log('[Beads API] GT_BASE_PATH not configured, skipping rigs.json');
      return [];
    }

    const rigsJsonPath = join(gtBasePath, 'mayor', 'rigs.json');
    const data = await readFile(rigsJsonPath, 'utf-8');
    const registry: RigsRegistry = JSON.parse(data);

    return Object.entries(registry.rigs).map(([name, config]) => ({
      id: `rig-${name}`,
      name,
      repo: config.git_url,
      prefix: config.beads.prefix,
      state: 'active' as RigState,
    }));
  } catch (error) {
    console.error('[Beads API] Failed to read rigs.json:', error);
    return [];
  }
}

/**
 * Derive convoys from feature/molecule issues
 * A convoy represents a work stream with multiple related issues
 * OPTIMIZED: Uses Map lookups instead of array filters
 */
function deriveConvoys(issues: Issue[], polecats: Polecat[]): Convoy[] {
  const convoys: Convoy[] = [];

  // Build issue lookup map once - O(n)
  const issueMap = new Map(issues.map(i => [i.id, i]));

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

    // Get the actual issue objects using Map lookup - O(convoy_size) instead of O(n)
    const convoyIssues: Issue[] = [];
    for (const id of convoyIssueIds) {
      const issue = issueMap.get(id);
      if (issue) convoyIssues.push(issue);
    }

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
    const startTime = Date.now();
    const now = Date.now();

    // Return cached result if fresh (< 5 seconds old)
    if (beadsCache && (now - beadsCache.timestamp) < BEADS_CACHE_TTL) {
      console.log('[Beads API] Cache hit, returning cached data');
      return NextResponse.json(beadsCache.data);
    }

    console.log('[Beads API] Cache miss, computing data...');
    const t1 = Date.now();

    const reader = getBeadsReader();
    const content = await reader.getIssuesRaw();
    const issues = parseJsonl<Issue>(content);
    console.log(`[Beads API] Parsed ${issues.length} issues in ${Date.now() - t1}ms`);

    const t2 = Date.now();
    // Fetch witnesses, polecats, and refineries from gt status --json (live data)
    const { witnesses, polecatsFromGt, refineries } = await fetchGtStatus();
    console.log(`[Beads API] Fetched gt status in ${Date.now() - t2}ms`);

    // Enrich refinery queue items with issue titles and URLs
    const issueMap = new Map(issues.map(i => [i.id, i]));
    for (const refinery of refineries) {
      if (refinery.queueItems) {
        for (const item of refinery.queueItems) {
          const issue = issueMap.get(item.id);
          if (issue) {
            item.title = `[${item.id}] ${issue.title}`;
            item.url = `/work?issue=${item.id}`;
          }
        }
      }
    }

    // Fetch rigs from rigs.json (canonical source)
    const rigsFromRegistry = await fetchRigsFromRegistry();

    // Fallback: Extract rigs from issues if registry is empty (legacy support)
    let rigs: Rig[] = rigsFromRegistry;
    if (rigs.length === 0) {
      rigs = issues
        .filter((issue) => issue.labels?.includes('gt:rig'))
        .map((issue) => parseRigFromIssue(issue))
        .filter((rig): rig is Rig => rig !== null);
    }
    console.log(`[Beads API] Found ${rigs.length} rigs`);

    // Use polecats from gt status if available, otherwise fall back to beads
    let polecats: Polecat[] = polecatsFromGt;
    if (polecats.length === 0) {
      // Fallback: Extract polecats from agent issues in beads
      polecats = issues
        .filter((issue) => issue.issue_type === 'agent')
        .map((issue) => parseAgentFromIssue(issue))
        .filter((agent): agent is Agent => agent !== null && agent.role_type === 'polecat')
        .map((agent) => ({
          id: agent.id,
          name: agent.title,
          rig: agent.rig,
          status: agent.agent_state,
          hooked_work: agent.hook_bead,
          unread_mail: 0, // Not available from beads, only from gt status
        }));
    }

    // Witnesses come from gt status (live data) - no fallback needed

    // Filter out agent issues from the main issues list for cleaner display
    const workIssues = issues.filter(
      (issue) => issue.issue_type !== 'agent' && !issue.labels?.includes('gt:rig')
    );

    // Fetch convoys from gt convoy list (pass cached convoys for fallback)
    const t3 = Date.now();
    const convoys = await fetchConvoys(beadsCache?.data?.convoys);
    console.log(`[Beads API] Fetched ${convoys.length} convoys in ${Date.now() - t3}ms`);

    const responseData = {
      issues: workIssues,
      rigs,
      polecats,
      witnesses,
      refineries,
      convoys,
      timestamp: new Date().toISOString(),
    };

    // Update cache
    beadsCache = {
      data: responseData,
      timestamp: Date.now(),
    };

    console.log(`[Beads API] Total request time: ${Date.now() - startTime}ms`);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching beads data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beads data' },
      { status: 500 }
    );
  }
}
