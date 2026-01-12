/**
 * API Route: GET /api/crew
 * Returns all crew members across rigs
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { CrewMember, CrewState, CrewStatus } from '@/types/crew';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

async function getCrewList(): Promise<CrewMember[]> {
  try {
    // Get list of crew workspaces
    const { stdout: listOutput } = await execAsync('gt crew list', {
      timeout: 10000,
    });

    const members: CrewMember[] = [];
    const lines = listOutput.split('\n');

    let currentMember: Partial<CrewMember> | null = null;

    for (const line of lines) {
      // Match crew member line: ● gt_dashboard/dashboard_dev or ○ gt_dashboard/dashboard_dev
      const memberMatch = line.match(/^\s*([●○])\s+(\S+)\/(\S+)/);
      if (memberMatch) {
        if (currentMember && currentMember.name) {
          members.push(currentMember as CrewMember);
        }
        const isRunning = memberMatch[1] === '●';
        const rig = memberMatch[2];
        const name = memberMatch[3];
        currentMember = {
          id: `${rig}/${name}`,
          name,
          rig,
          status: isRunning ? 'running' : 'stopped',
          branch: 'main',
          gitStatus: 'clean',
          path: '',
          mailCount: 0,
        };
        continue;
      }

      // Match branch/git info: Branch: main  Git: dirty
      const branchMatch = line.match(/^\s*Branch:\s*(\S+)\s+Git:\s*(\S+)/);
      if (branchMatch && currentMember) {
        currentMember.branch = branchMatch[1];
        currentMember.gitStatus = branchMatch[2] === 'dirty' ? 'dirty' : 'clean';
        continue;
      }

      // Match path line
      const pathMatch = line.match(/^\s*(\/\S+)/);
      if (pathMatch && currentMember) {
        currentMember.path = pathMatch[1];
        continue;
      }
    }

    // Push last member
    if (currentMember && currentMember.name) {
      members.push(currentMember as CrewMember);
    }

    // Get detailed status for each running member
    for (const member of members) {
      if (member.status === 'running') {
        try {
          const { stdout: statusOutput } = await execAsync(
            `gt crew status ${member.name}`,
            { timeout: 5000 }
          );

          // Parse mail count from status
          const mailMatch = statusOutput.match(/Mail:\s*(\d+)\s*messages?/);
          if (mailMatch) {
            member.mailCount = parseInt(mailMatch[1], 10);
          }
        } catch {
          // Status check failed, keep defaults
        }
      }
    }

    return members;
  } catch (error) {
    console.error('Error fetching crew list:', error);
    return [];
  }
}

export async function GET() {
  try {
    const members = await getCrewList();

    const state: CrewState = {
      members,
      totalCount: members.length,
      runningCount: members.filter((m) => m.status === 'running').length,
      stoppedCount: members.filter((m) => m.status === 'stopped').length,
    };

    return NextResponse.json(state);
  } catch (error) {
    console.error('Error in crew API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crew data' },
      { status: 500 }
    );
  }
}
