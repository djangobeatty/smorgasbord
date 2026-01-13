/**
 * Server-side beads data reader
 * Queries the beads daemon for live data
 * Only use in server context (API routes, Server Components)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execGt } from './exec-gt';

export interface BeadsReaderConfig {
  beadsPath: string;
}

/**
 * Resolve a beads path, following redirect files if present
 * A redirect file contains the relative path to the actual beads directory
 */
export async function resolveBeadsPath(beadsPath: string): Promise<string> {
  const redirectPath = path.join(beadsPath, 'redirect');
  try {
    const redirectContent = await fs.readFile(redirectPath, 'utf-8');
    const redirectTarget = redirectContent.trim();
    // Resolve relative to the directory containing the redirect file
    const resolvedPath = path.resolve(beadsPath, redirectTarget);
    // Recursively resolve in case of chained redirects
    return resolveBeadsPath(resolvedPath);
  } catch {
    // No redirect file, use the path as-is
    return beadsPath;
  }
}

/**
 * Discover all rigs in the Gas Town by looking for .beads directories
 */
export async function discoverRigs(basePath: string): Promise<string[]> {
  const rigs: string[] = [];

  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const beadsPath = path.join(basePath, entry.name, '.beads');
        try {
          await fs.access(beadsPath);
          rigs.push(entry.name);
        } catch {
          // No .beads directory, not a rig
        }
      }
    }
  } catch (error) {
    console.error('Error discovering rigs:', error);
  }

  return rigs;
}

/**
 * Query the beads daemon for live issue data
 * This replaces reading from stale issues.jsonl
 * Converts JSON array output to JSONL format for compatibility
 */
export async function queryBeadsDaemon(beadsPath: string): Promise<string> {
  // Resolve any redirect files first
  const resolvedPath = await resolveBeadsPath(beadsPath);

  try {
    // Run bd list --all --json --limit 0 from the beads directory to get live data
    // --all: include closed beads (default excludes them)
    // --limit 0: get all beads (default is 50)
    const { stdout } = await execGt('bd list --all --json --limit 0', {
      cwd: resolvedPath,
      timeout: 10000, // 10 second timeout
    });

    // bd list --json returns a JSON array, convert to JSONL for compatibility
    const issues = JSON.parse(stdout.trim() || '[]');
    if (Array.isArray(issues)) {
      return issues.map(issue => JSON.stringify(issue)).join('\n');
    }

    // If not an array, return as-is (might already be JSONL)
    return stdout;
  } catch (error) {
    console.error(`Error querying beads daemon at ${resolvedPath}:`, error);
    // Fall back to reading issues.jsonl if bd command fails
    return readIssuesJsonlFallback(resolvedPath);
  }
}

/**
 * Fallback: Read issues.jsonl from a specific beads directory
 * Used when bd daemon is unavailable
 */
async function readIssuesJsonlFallback(beadsPath: string): Promise<string> {
  const issuesPath = path.join(beadsPath, 'issues.jsonl');
  try {
    return await fs.readFile(issuesPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading ${issuesPath}:`, error);
    return '';
  }
}

/**
 * Read issues.jsonl from a specific beads directory
 * Follows redirect files if present
 * @deprecated Use queryBeadsDaemon instead for live data
 */
export async function readIssuesJsonl(beadsPath: string): Promise<string> {
  // Now delegates to queryBeadsDaemon for live data
  return queryBeadsDaemon(beadsPath);
}

/**
 * Read and aggregate issues from multiple rigs
 * Queries the beads daemon for live data from each rig
 */
export async function readAllIssues(rigPaths: Record<string, string>): Promise<string> {
  const allLines: string[] = [];

  for (const [rigName, beadsPath] of Object.entries(rigPaths)) {
    try {
      // Query daemon for live data
      const content = await queryBeadsDaemon(beadsPath);
      const lines = content.split('\n').filter((line) => line.trim());

      // Add rig context to each issue
      for (const line of lines) {
        try {
          const issue = JSON.parse(line);
          issue._rig = rigName;
          allLines.push(JSON.stringify(issue));
        } catch {
          // Skip invalid JSON lines
        }
      }
    } catch (error) {
      console.error(`Error reading issues from ${rigName}:`, error);
    }
  }

  return allLines.join('\n');
}

/**
 * Get the beads path from environment or default location
 */
export function getBeadsPath(): string {
  return process.env.BEADS_PATH ?? path.join(process.cwd(), '..', '..', '..', '.beads');
}

interface GtStatusRig {
  name: string;
  polecat_count: number;
  has_witness: boolean;
  has_refinery: boolean;
}

interface GtStatusOutput {
  name: string;
  location: string;
  rigs?: GtStatusRig[];
}

// Cache for detected rigs (refreshed on each BeadsReader instantiation)
let cachedRigPaths: Record<string, string> | null = null;
let cachedBasePath: string | null = null;

/**
 * Auto-detect rigs from gt status --json
 * Returns rig paths for all rigs in the Gas Town
 */
export async function detectRigsFromGtStatus(): Promise<{ basePath: string; rigPaths: Record<string, string> }> {
  try {
    const { stdout } = await execGt('gt status --json', {
      timeout: 5000,
    });

    const data: GtStatusOutput = JSON.parse(stdout.trim());
    const basePath = data.location;
    const rigPaths: Record<string, string> = {};

    if (data.rigs && Array.isArray(data.rigs)) {
      for (const rig of data.rigs) {
        rigPaths[rig.name] = path.join(basePath, rig.name, '.beads');
      }
    }

    // Cache the results
    cachedBasePath = basePath;
    cachedRigPaths = rigPaths;

    return { basePath, rigPaths };
  } catch (error) {
    console.error('Error detecting rigs from gt status:', error);
    // Fall back to environment variables or defaults
    return { basePath: '', rigPaths: {} };
  }
}

/**
 * Get multi-rig configuration
 * Priority: 1) Cached detection, 2) Environment vars, 3) Default single rig
 */
export function getRigPaths(): Record<string, string> {
  // Use cached detection if available
  if (cachedRigPaths && Object.keys(cachedRigPaths).length > 0) {
    return cachedRigPaths;
  }

  // Fall back to environment variables
  const rigsEnv = process.env.GT_RIGS;
  const basePath = process.env.GT_BASE_PATH ?? cachedBasePath ?? path.join(process.cwd(), '..', '..', '..');

  if (rigsEnv) {
    // Parse comma-separated rig names
    const rigNames = rigsEnv.split(',').map((r) => r.trim());
    const paths: Record<string, string> = {};

    for (const rigName of rigNames) {
      paths[rigName] = path.join(basePath, rigName, '.beads');
    }

    return paths;
  }

  // Default: single rig at relative path
  return {
    default: getBeadsPath(),
  };
}

export class BeadsReader {
  private beadsPath: string;
  private rigPaths: Record<string, string>;
  private initialized: boolean = false;

  constructor(config?: BeadsReaderConfig) {
    this.beadsPath = config?.beadsPath ?? getBeadsPath();
    this.rigPaths = getRigPaths();
  }

  /**
   * Initialize by auto-detecting rigs from gt status
   * Called automatically on first getIssuesRaw() if not already initialized
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const { rigPaths } = await detectRigsFromGtStatus();
    if (Object.keys(rigPaths).length > 0) {
      this.rigPaths = rigPaths;
    }
    this.initialized = true;
  }

  async getIssuesRaw(): Promise<string> {
    // Auto-initialize on first call
    await this.initialize();

    // Always aggregate from all detected rigs
    if (Object.keys(this.rigPaths).length > 0) {
      return readAllIssues(this.rigPaths);
    }
    return readIssuesJsonl(this.beadsPath);
  }

  async getRigNames(): Promise<string[]> {
    await this.initialize();
    return Object.keys(this.rigPaths);
  }
}

// Singleton instance
let reader: BeadsReader | null = null;

export function getBeadsReader(): BeadsReader {
  if (!reader) {
    reader = new BeadsReader();
  }
  return reader;
}

/**
 * Force re-detection of rigs (useful after config changes)
 */
export function resetBeadsReader(): void {
  reader = null;
  cachedRigPaths = null;
  cachedBasePath = null;
}
