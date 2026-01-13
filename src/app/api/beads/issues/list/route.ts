/**
 * API Route: GET /api/beads/issues/list
 * Paginated issues endpoint with server-side filtering
 *
 * Query params:
 * - status: filter by status (open, in_progress, blocked, closed)
 * - limit: max results per page (default 50)
 * - cursor: ISO timestamp for cursor-based pagination (created_after)
 * - search: search title and description
 * - rig: filter by rig name
 * - assignee: filter by assignee
 * - priority: filter by priority (0-4)
 * - sort: sort field (priority, created, updated) - default: priority
 * - order: asc or desc - default: asc
 */

import { NextResponse } from 'next/server';
import path from 'path';
import { execGt } from '@/lib/exec-gt';
import { detectRigsFromGtStatus, resolveBeadsPath } from '@/lib/beads-reader';
import type { Issue, IssueStatus } from '@/types/beads';

export const dynamic = 'force-dynamic';

interface PaginatedResponse {
  issues: Issue[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Query a single rig with bd list and filters
 */
async function queryRigIssues(
  rigName: string,
  beadsPath: string,
  params: {
    status?: string;
    search?: string;
    assignee?: string;
    priority?: string;
    includeAll?: boolean;
  }
): Promise<Issue[]> {
  const resolvedPath = await resolveBeadsPath(beadsPath);

  // Build bd list command with filters
  const args: string[] = ['list', '--json', '--limit', '0'];

  // Status filter - if specified, use it; otherwise include all
  if (params.status) {
    args.push('--status', params.status);
  } else if (params.includeAll) {
    args.push('--all');
  }

  // Assignee filter
  if (params.assignee) {
    args.push('--assignee', params.assignee);
  }

  // Priority filter
  if (params.priority) {
    args.push('--priority', params.priority);
  }

  // Search filter (title)
  if (params.search) {
    args.push('--title-contains', params.search);
  }

  const command = `bd ${args.join(' ')}`;

  try {
    const { stdout } = await execGt(command, {
      cwd: resolvedPath,
      timeout: 10000,
    });

    const issues: Issue[] = JSON.parse(stdout.trim() || '[]');

    // Add rig context to each issue
    return issues.map(issue => ({
      ...issue,
      _rig: rigName,
    }));
  } catch (error) {
    console.error(`Error querying rig ${rigName}:`, error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const status = searchParams.get('status') as IssueStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor'); // ISO timestamp
    const search = searchParams.get('search');
    const rigFilter = searchParams.get('rig');
    const assignee = searchParams.get('assignee');
    const priority = searchParams.get('priority');
    const sort = searchParams.get('sort') || 'priority';
    const order = searchParams.get('order') || 'asc';

    // Get all rigs
    const { basePath, rigPaths } = await detectRigsFromGtStatus();

    // If no rigs detected, return empty
    if (Object.keys(rigPaths).length === 0) {
      return NextResponse.json({
        issues: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      } as PaginatedResponse);
    }

    // Filter to specific rig if requested
    const rigsToQuery = rigFilter
      ? { [rigFilter]: rigPaths[rigFilter] }
      : rigPaths;

    // Query each rig in parallel
    const rigQueries = Object.entries(rigsToQuery)
      .filter(([_, path]) => path) // Filter out undefined paths
      .map(([rigName, beadsPath]) =>
        queryRigIssues(rigName, beadsPath, {
          status: status || undefined,
          search: search || undefined,
          assignee: assignee || undefined,
          priority: priority || undefined,
          includeAll: !status, // Include all if no status filter
        })
      );

    const results = await Promise.all(rigQueries);
    let allIssues = results.flat();

    // Filter out agent issues (internal to beads)
    allIssues = allIssues.filter(issue => issue.issue_type !== 'agent');

    // Apply cursor filter (created_after)
    if (cursor) {
      const cursorDate = new Date(cursor);
      allIssues = allIssues.filter(issue =>
        new Date(issue.created_at) > cursorDate
      );
    }

    // Additional description search (bd only searches title)
    if (search) {
      const searchLower = search.toLowerCase();
      allIssues = allIssues.filter(issue =>
        issue.title.toLowerCase().includes(searchLower) ||
        issue.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    allIssues.sort((a, b) => {
      let comparison = 0;

      switch (sort) {
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        default:
          comparison = a.priority - b.priority;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    // Calculate pagination
    const total = allIssues.length;
    const hasMore = total > limit;
    const paginatedIssues = allIssues.slice(0, limit);

    // Get cursor for next page (timestamp of last item)
    const nextCursor = hasMore && paginatedIssues.length > 0
      ? paginatedIssues[paginatedIssues.length - 1].created_at
      : null;

    return NextResponse.json({
      issues: paginatedIssues,
      total,
      hasMore,
      nextCursor,
    } as PaginatedResponse);
  } catch (error) {
    console.error('Error fetching paginated issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}
