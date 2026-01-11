/**
 * Server-side beads file reader
 * Reads beads data directly from the filesystem
 * Only use in server context (API routes, Server Components)
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface BeadsReaderConfig {
  beadsPath: string;
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
 * Read issues.jsonl from a specific beads directory
 */
export async function readIssuesJsonl(beadsPath: string): Promise<string> {
  const issuesPath = path.join(beadsPath, 'issues.jsonl');
  try {
    return await fs.readFile(issuesPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading ${issuesPath}:`, error);
    return '';
  }
}

/**
 * Read and aggregate issues from multiple rigs
 */
export async function readAllIssues(rigPaths: Record<string, string>): Promise<string> {
  const allLines: string[] = [];

  for (const [rigName, beadsPath] of Object.entries(rigPaths)) {
    try {
      const content = await readIssuesJsonl(beadsPath);
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

/**
 * Get multi-rig configuration from environment
 */
export function getRigPaths(): Record<string, string> {
  const rigsEnv = process.env.GT_RIGS;
  const basePath = process.env.GT_BASE_PATH ?? path.join(process.cwd(), '..', '..', '..');

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
  private multiRig: boolean;
  private rigPaths: Record<string, string>;

  constructor(config?: BeadsReaderConfig) {
    this.beadsPath = config?.beadsPath ?? getBeadsPath();
    this.rigPaths = getRigPaths();
    this.multiRig = Object.keys(this.rigPaths).length > 1;
  }

  async getIssuesRaw(): Promise<string> {
    if (this.multiRig) {
      return readAllIssues(this.rigPaths);
    }
    return readIssuesJsonl(this.beadsPath);
  }

  async getRigNames(): Promise<string[]> {
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
