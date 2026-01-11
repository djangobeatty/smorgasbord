/**
 * API Route: GET /api/deacon
 * Returns deacon (daemon) status including:
 * - Alive/dead status
 * - Last activity timestamp
 * - Patrol interval
 * - Recent log entries
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface DaemonLock {
  pid: number;
  parent_pid: number;
  database: string;
  version: string;
  started_at: string;
}

interface DeaconStatus {
  alive: boolean;
  pid: number | null;
  version: string | null;
  started_at: string | null;
  uptime_seconds: number | null;
  interval: string;
  last_activity: string | null;
  recent_logs: string[];
  error_logs: string[];
}

function getBeadsPath(): string {
  return process.env.BEADS_PATH ?? path.join(process.cwd(), '..', '..', '..', '.beads');
}

async function checkProcessAlive(pid: number): Promise<boolean> {
  try {
    // On Unix, sending signal 0 checks if process exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function parseLogForInterval(logPath: string): Promise<string> {
  try {
    const content = await fs.readFile(logPath, 'utf-8');
    const lines = content.split('\n');

    // Look for interval in startup message
    for (const line of lines) {
      if (line.includes('Daemon started') && line.includes('interval')) {
        // Parse interval from log line like: interval: %v -> 5s
        const match = line.match(/interval.*?(\d+[smh])/i);
        if (match) return match[1];
      }
    }
  } catch {
    // Ignore read errors
  }
  return '5s'; // Default interval
}

async function getRecentLogs(logPath: string, count: number = 5): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`tail -${count} "${logPath}"`);
    return stdout.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

async function getErrorLogs(logPath: string, count: number = 5): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`grep -i "error\\|warn" "${logPath}" | tail -${count}`);
    return stdout.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

async function getLastActivity(logPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`tail -1 "${logPath}"`);
    const line = stdout.trim();
    // Parse timestamp from log line: time=2026-01-12T01:58:11.286+07:00
    const match = line.match(/time=([^\s]+)/);
    if (match) return match[1];
  } catch {
    // Ignore errors
  }
  return null;
}

export async function GET() {
  try {
    const beadsPath = getBeadsPath();
    const lockPath = path.join(beadsPath, 'daemon.lock');
    const logPath = path.join(beadsPath, 'daemon.log');

    const status: DeaconStatus = {
      alive: false,
      pid: null,
      version: null,
      started_at: null,
      uptime_seconds: null,
      interval: '5s',
      last_activity: null,
      recent_logs: [],
      error_logs: [],
    };

    // Try to read daemon.lock
    try {
      const lockContent = await fs.readFile(lockPath, 'utf-8');
      const lock: DaemonLock = JSON.parse(lockContent);

      status.pid = lock.pid;
      status.version = lock.version;
      status.started_at = lock.started_at;

      // Check if process is actually alive
      status.alive = await checkProcessAlive(lock.pid);

      // Calculate uptime if alive
      if (status.alive && lock.started_at) {
        const startTime = new Date(lock.started_at).getTime();
        const now = Date.now();
        status.uptime_seconds = Math.floor((now - startTime) / 1000);
      }
    } catch {
      // daemon.lock doesn't exist or is invalid - daemon not running
      status.alive = false;
    }

    // Get interval from logs
    status.interval = await parseLogForInterval(logPath);

    // Get last activity timestamp
    status.last_activity = await getLastActivity(logPath);

    // Get recent logs
    status.recent_logs = await getRecentLogs(logPath, 5);

    // Get error logs
    status.error_logs = await getErrorLogs(logPath, 5);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching deacon status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deacon status' },
      { status: 500 }
    );
  }
}
