/**
 * API Route: GET /api/beads/issues
 * Returns raw issues.jsonl content from beads system
 */

import { NextResponse } from 'next/server';
import { getBeadsReader } from '@/lib/beads-reader';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rig = searchParams.get('rig');

    const reader = getBeadsReader();
    const content = await reader.getIssuesRaw();

    // If rig filter specified, filter the JSONL lines
    if (rig) {
      const lines = content.split('\n').filter((line) => {
        if (!line.trim()) return false;
        try {
          const issue = JSON.parse(line);
          return issue._rig === rig || issue.id.startsWith(`${rig}-`);
        } catch {
          return false;
        }
      });
      return new NextResponse(lines.join('\n'), {
        headers: { 'Content-Type': 'application/x-ndjson' },
      });
    }

    return new NextResponse(content, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}
