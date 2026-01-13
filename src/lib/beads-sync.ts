/**
 * Utility for handling beads database synchronization
 * Auto-syncs when database is out of sync with JSONL
 */

import { execGt } from './exec-gt';
import path from 'path';

/**
 * Try to sync the beads database for a rig if it's out of sync
 */
export async function tryAutoSync(rig: string): Promise<boolean> {
  const basePath = process.env.GT_BASE_PATH;
  if (!basePath) return false;

  const rigPath = path.join(basePath, rig);
  try {
    // Try bd import to sync the database
    await execGt(`bd import -i .beads/issues.jsonl`, { cwd: rigPath, timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an error is a database sync error
 */
export function isDatabaseSyncError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Database out of sync');
  }
  return false;
}

/**
 * Execute a gt command with auto-sync retry on database sync errors
 */
export async function execGtWithAutoSync(
  command: string,
  rigForSync?: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execGt(command);
  } catch (error) {
    if (rigForSync && isDatabaseSyncError(error)) {
      const synced = await tryAutoSync(rigForSync);
      if (synced) {
        // Retry the command after sync
        return await execGt(command);
      }
    }
    throw error;
  }
}
