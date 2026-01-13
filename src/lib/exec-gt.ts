/**
 * Utility for executing gt/bd commands from API routes
 * Ensures PATH includes /usr/local/bin and /opt/homebrew/bin
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ExecGtOptions {
  timeout?: number;
  cwd?: string;
}

const DEFAULT_TIMEOUT = 10000;

// Cache for gt status --json results
interface StatusCache {
  data: unknown;
  timestamp: number;
}
let statusCache: StatusCache | null = null;
let statusFetchPromise: Promise<unknown> | null = null;
const STATUS_CACHE_TTL = 5000; // 5 second TTL to match beads polling interval

/**
 * Get the Gas Town root directory from GT_BASE_PATH env var
 * Returns null if not configured
 */
function getGtRoot(): string | null {
  return process.env.GT_BASE_PATH || null;
}

/**
 * Execute a gt or bd command with proper PATH configuration
 * Commands are run from the Gas Town root to ensure gt/bd commands work correctly
 */
export async function execGt(
  command: string,
  options: ExecGtOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = DEFAULT_TIMEOUT, cwd } = options;

  // Use provided cwd, or GT_BASE_PATH if configured
  const workingDir = cwd || getGtRoot() || undefined;

  return execAsync(command, {
    timeout,
    cwd: workingDir,
    env: {
      ...process.env,
    },
  });
}

/**
 * Execute gt status --json and return parsed result
 * Caches results for 5 seconds to match beads polling interval
 */
export async function getGtStatus<T = unknown>(): Promise<T | null> {
  const now = Date.now();

  // Return cached result if fresh (< 5 seconds old)
  if (statusCache && (now - statusCache.timestamp) < STATUS_CACHE_TTL) {
    return statusCache.data as T;
  }

  // If a fetch is already in progress, wait for it instead of starting another
  if (statusFetchPromise) {
    return statusFetchPromise as Promise<T | null>;
  }

  // Start a new fetch
  statusFetchPromise = (async () => {
    try {
      const { stdout } = await execGt('gt status --json 2>/dev/null || echo "{}"', {
        timeout: 15000, // 15 second timeout for gt status
      });
      const data = JSON.parse(stdout.trim() || '{}');

      // Update cache
      statusCache = {
        data,
        timestamp: Date.now(),
      };

      return data;
    } catch (error) {
      console.error('Error getting gt status:', error);
      return null;
    } finally {
      // Clear the in-progress promise
      statusFetchPromise = null;
    }
  })();

  return statusFetchPromise as Promise<T | null>;
}

/**
 * Execute bd command and return result
 */
export async function execBd(
  subcommand: string,
  args: string[] = [],
  options: ExecGtOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const cmd = ['bd', subcommand, ...args].join(' ');
  return execGt(cmd, options);
}

/**
 * Clear the cached gt status result (useful for testing)
 */
export function resetStatusCache(): void {
  statusCache = null;
  statusFetchPromise = null;
}

/**
 * Get the currently resolved Gas Town root path (for display in settings)
 * Returns null if GT_BASE_PATH is not configured
 */
export function getResolvedGtRoot(): string | null {
  return getGtRoot();
}
