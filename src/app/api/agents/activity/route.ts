/**
 * API Route: GET /api/agents/activity
 * Returns current activity for all agents by reading their tmux sessions
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getGtStatus } from '@/lib/exec-gt';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface AgentActivity {
  session: string;
  name: string;
  role: string;
  activity: string;
  activities: string[];  // Last 3 activities for history view
  duration?: string;
  tool?: string;
}

/**
 * Parse tmux output to extract current activity and history
 * Extracts meaningful context from the visible pane content
 * Returns current activity plus last 3 meaningful activities for history
 */
function parseActivity(output: string): { activity: string; activities: string[]; duration?: string; tool?: string } {
  const lines = output.split('\n');
  const reversedLines = [...lines].reverse();
  const recentActivities: string[] = [];

  // Helper to add activity to history (deduped, max 3)
  const addActivity = (act: string) => {
    if (act && !recentActivities.includes(act) && recentActivities.length < 3) {
      recentActivities.push(act);
    }
  };

  // Collect recent activities from output
  for (const line of reversedLines) {
    if (recentActivities.length >= 3) break;

    // Match thinking/processing states: ✻ Action... (Xm Ys)
    const thinkingMatch = line.match(/[✻✶✢]\s+(.+?)\s*(?:…|\.\.\.)\s*(?:\((?:ctrl\+c to interrupt\s*·\s*)?(\d+m?\s*\d*s?))?/);
    if (thinkingMatch) {
      addActivity(thinkingMatch[1].trim());
      continue;
    }

    // Match tool use: ⏺ Tool(args)
    const toolMatch = line.match(/⏺\s+(\w+)\((.+?)\)/);
    if (toolMatch) {
      const tool = toolMatch[1];
      const args = toolMatch[2].slice(0, 40) + (toolMatch[2].length > 40 ? '...' : '');
      addActivity(`${tool}: ${args}`);
      continue;
    }

    // Match running command
    if (line.includes('Running…') || line.includes('Running...')) {
      addActivity('Running command...');
    }
  }

  // First check for active states (thinking, tool use) for current activity
  for (const line of reversedLines) {
    // Match thinking/processing states: ✻ Action... (Xm Ys)
    const thinkingMatch = line.match(/[✻✶✢]\s+(.+?)\s*(?:…|\.\.\.)\s*(?:\((?:ctrl\+c to interrupt\s*·\s*)?(\d+m?\s*\d*s?))?/);
    if (thinkingMatch) {
      return {
        activity: thinkingMatch[1].trim(),
        activities: recentActivities,
        duration: thinkingMatch[2]?.trim(),
      };
    }

    // Match tool use: ⏺ Tool(args)
    const toolMatch = line.match(/⏺\s+(\w+)\((.+?)\)/);
    if (toolMatch) {
      const tool = toolMatch[1];
      const args = toolMatch[2].slice(0, 50) + (toolMatch[2].length > 50 ? '...' : '');
      return {
        activity: `${tool}: ${args}`,
        activities: recentActivities,
        tool,
      };
    }

    // Match running command
    if (line.includes('Running…') || line.includes('Running...')) {
      return { activity: 'Running command...', activities: recentActivities };
    }
  }

  // If at prompt, find the last meaningful content
  const hasPrompt = output.includes('❯') && !output.includes('✻') && !output.includes('⏺');
  if (hasPrompt) {
    // Look for Claude's last response (starts after ⏺ and before ❯)
    // Find lines with actual content (not just UI chrome)
    const contentLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines, UI elements, and decorative lines
      if (!trimmed) continue;
      if (trimmed.startsWith('─')) continue;
      if (trimmed.startsWith('│')) continue;
      if (trimmed.startsWith('╭') || trimmed.startsWith('╰')) continue;
      if (trimmed.includes('bypass permissions')) continue;
      if (trimmed.includes('shift+tab')) continue;
      if (trimmed.includes('⏵⏵')) continue;
      if (trimmed.includes('/ide for')) continue;
      if (trimmed.match(/^[▐▛▜▘▝]+$/)) continue;
      if (trimmed.startsWith('❯') && trimmed.length < 3) continue;

      // This looks like actual content
      contentLines.push(trimmed);
    }

    // Get the last few meaningful lines
    const lastContent = contentLines.slice(-3).join(' ').trim();
    if (lastContent.length > 0) {
      // Truncate to reasonable length
      const truncated = lastContent.length > 80 ? lastContent.slice(0, 77) + '...' : lastContent;
      return { activity: `Waiting: ${truncated}`, activities: recentActivities };
    }

    return { activity: 'At prompt', activities: recentActivities };
  }

  // Try to find any recent output as fallback
  const nonEmptyLines = lines.filter(l => l.trim().length > 0 && !l.includes('───'));
  if (nonEmptyLines.length > 0) {
    const lastLine = nonEmptyLines[nonEmptyLines.length - 1].trim().slice(0, 60);
    return { activity: lastLine || 'Active', activities: recentActivities };
  }

  return { activity: 'No output', activities: recentActivities };
}

// Check if tmux is available (cached)
let tmuxAvailable: boolean | null = null;

// Store activity history per agent (persists between requests)
const activityHistory: Map<string, string[]> = new Map();

async function checkTmux(): Promise<boolean> {
  if (tmuxAvailable !== null) return tmuxAvailable;
  try {
    await execAsync('which tmux', { timeout: 2000 });
    tmuxAvailable = true;
  } catch {
    tmuxAvailable = false;
  }
  return tmuxAvailable;
}

async function getAgentActivity(session: string, name: string, role: string): Promise<AgentActivity | null> {
  try {
    const { stdout } = await execAsync(`tmux capture-pane -t ${session} -p 2>/dev/null | tail -30`, {
      timeout: 3000,
    });

    const parsed = parseActivity(stdout);

    // Get or create history for this agent
    const historyKey = `${session}`;
    let history = activityHistory.get(historyKey) || [];

    // Add current activity to history if it's new (different from last)
    const currentActivity = parsed.activity;
    if (currentActivity && history[0] !== currentActivity) {
      // Prepend new activity, keep max 5 for history
      history = [currentActivity, ...history].slice(0, 5);
      activityHistory.set(historyKey, history);
    }

    return {
      session,
      name,
      role,
      activity: currentActivity,
      // Return current + previous 2 activities from history
      activities: history.slice(0, 3),
      duration: parsed.duration,
      tool: parsed.tool,
    };
  } catch {
    // Session doesn't exist or tmux error - return null silently
    return null;
  }
}

export async function GET() {
  try {
    // Check if tmux is available
    const hasTmux = await checkTmux();
    if (!hasTmux) {
      return NextResponse.json({ activities: [], tmuxAvailable: false });
    }

    // Get list of agents from gt status (uses cached result)
    const status = await getGtStatus<{
      agents?: Array<{ session?: string; name: string; role?: string; running?: boolean }>;
      rigs?: Array<{
        name: string;
        agents?: Array<{ session?: string; name: string; role?: string; running?: boolean }>;
      }>;
    }>();

    if (!status) {
      return NextResponse.json({ activities: [], error: 'Could not get gt status' });
    }
    const activities: AgentActivity[] = [];

    // Collect all agents
    const agents: { session: string; name: string; role: string }[] = [];

    // HQ agents (mayor, deacon)
    if (status.agents) {
      for (const agent of status.agents) {
        if (agent.session && agent.running) {
          agents.push({
            session: agent.session,
            name: agent.name,
            role: agent.role || agent.name,
          });
        }
      }
    }

    // Rig agents (crew, polecats, witness, refinery)
    if (status.rigs) {
      for (const rig of status.rigs) {
        if (rig.agents) {
          for (const agent of rig.agents) {
            if (agent.session && agent.running) {
              agents.push({
                session: agent.session,
                name: agent.name,
                role: agent.role || 'worker',
              });
            }
          }
        }
      }
    }

    // Fetch activity for all agents in parallel
    const activityPromises = agents.map(a => getAgentActivity(a.session, a.name, a.role));
    const results = await Promise.all(activityPromises);

    for (const result of results) {
      if (result) {
        activities.push(result);
      }
    }

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching agent activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent activity', activities: [] },
      { status: 500 }
    );
  }
}
