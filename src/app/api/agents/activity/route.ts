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
 * Check if a line is UI chrome (not meaningful activity)
 */
function isUiChrome(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('─')) return true;
  // Only filter pure border lines, not table rows with content
  if (trimmed.match(/^[│├┤]+\s*$/)) return true;
  if (trimmed.startsWith('╭') || trimmed.startsWith('╰')) return true;
  if (trimmed.includes('bypass permissions')) return true;
  if (trimmed.includes('shift+tab')) return true;
  if (trimmed.includes('⏵⏵')) return true;
  if (trimmed.includes('/ide for')) return true;
  if (trimmed.match(/^[▐▛▜▘▝\s]+$/)) return true;
  // Filter out lines that are mostly spinner/block chars with path or model name
  if (trimmed.match(/^[▐▛▜▘▝█\s]+/)) return true;
  // Filter out status bar lines (framed content like path, model, user)
  if (trimmed.match(/^│.*│\s*$/) && !trimmed.includes('→')) return true;
  // Filter out prompt lines (input prompt with or without text)
  if (trimmed.startsWith('❯')) return true;
  // Filter out common prompt indicators
  if (trimmed.includes('↵ send')) return true;
  return false;
}

/**
 * Parse tmux output to extract current activity and history
 * Extracts meaningful context from the visible pane content
 * Returns current activity plus last 3 meaningful activities for history
 */
function parseActivity(output: string): { activity: string; activities: string[]; duration?: string; tool?: string } {
  // Strip ANSI escape sequences
  const cleanOutput = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\^?\[/g, '');
  const lines = cleanOutput.split('\n');
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
      addActivity(`${toolMatch[1]}: ${toolMatch[2]}`);
      continue;
    }

    // Match running command with command text
    const runningMatch = line.match(/Running[…\.]+\s*(.+)/);
    if (runningMatch) {
      addActivity(`Running: ${runningMatch[1].trim()}`);
      continue;
    }

    // Also collect meaningful output lines (not UI chrome, not completion markers)
    if (!isUiChrome(line)) {
      const trimmed = line.trim();
      // Skip completion markers for history
      if (/^[✻✶✢]\s+\w+\s+for\s+\d+/.test(trimmed)) continue;
      // Skip very short lines
      if (trimmed.length < 15) continue;
      // Skip table borders
      if (trimmed.match(/^[┌┐└┘├┤┬┴┼─│]+$/)) continue;
      // Skip mid-sentence continuations
      if (trimmed.match(/^[a-z)}\]]/)) continue;
      addActivity(trimmed);
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
      return {
        activity: `${toolMatch[1]}: ${toolMatch[2]}`,
        activities: recentActivities,
        tool: toolMatch[1],
      };
    }

    // Match running command with command text
    const runningMatch = line.match(/Running[…\.]+\s*(.+)/);
    if (runningMatch) {
      return { activity: `Running: ${runningMatch[1].trim()}`, activities: recentActivities };
    }
  }

  // Check if actively thinking (has ellipsis pattern)
  const isActivelyThinking = /[✻✶✢]\s+.+?(?:…|\.\.\.)/.test(output);

  // Check if at prompt by looking at the last few non-empty lines (not just anywhere in output)
  // The prompt line contains ❯ and typically has ↵ send nearby
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);
  const lastFewLines = nonEmptyLines.slice(-8).join('\n');
  const hasPromptAtEnd = lastFewLines.includes('❯') && !isActivelyThinking;
  if (hasPromptAtEnd) {
    // Find lines with actual content (not just UI chrome or completion markers)
    const contentLines = lines.filter(l => {
      if (isUiChrome(l)) return false;
      const trimmed = l.trim();
      // Filter out completion markers like "✻ Sautéed for 1m 14s"
      if (/^[✻✶✢]\s+\w+\s+for\s+\d+/.test(trimmed)) return false;
      return true;
    }).map(l => l.trim());

    // Get the last few meaningful lines
    const lastContent = contentLines.slice(-3).join(' ').trim();
    if (lastContent.length > 0) {
      return { activity: `Idle: ${lastContent}`, activities: recentActivities };
    }

    return { activity: 'Idle', activities: recentActivities };
  }

  // Try to find any recent output as fallback (filter out UI chrome and completion markers)
  const meaningfulLines = lines.filter(l => {
    if (isUiChrome(l)) return false;
    const trimmed = l.trim();
    // Filter out completion markers like "✻ Brewed for 2m 38s"
    if (/^[✻✶✢]\s+\w+\s+for\s+\d+/.test(trimmed)) return false;
    // Skip very short lines (partial text, fragments)
    if (trimmed.length < 15) return false;
    // Skip table borders
    if (trimmed.match(/^[┌┐└┘├┤┬┴┼─│]+$/)) return false;
    // Skip mid-sentence continuations (start with lowercase or closing punctuation)
    if (trimmed.match(/^[a-z)}\]]/)) return false;
    return true;
  });
  if (meaningfulLines.length > 0) {
    const lastLine = meaningfulLines[meaningfulLines.length - 1].trim();
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
