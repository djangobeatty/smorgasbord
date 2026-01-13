/**
 * React hook for paginated issues
 * Each kanban column can fetch its own data independently
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Issue, IssueStatus } from '@/types/beads';

interface PaginatedResponse {
  issues: Issue[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

interface UsePaginatedIssuesOptions {
  status: IssueStatus | IssueStatus[];
  limit?: number;
  rig?: string;
  search?: string;
  assignee?: string;
  priority?: number;
  enabled?: boolean;
  pollingInterval?: number;
}

interface UsePaginatedIssuesResult {
  issues: Issue[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateIssue: (issueId: string, updates: Partial<Issue>) => void;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_POLLING_INTERVAL = 5000;

export function usePaginatedIssues(
  options: UsePaginatedIssuesOptions
): UsePaginatedIssuesResult {
  const {
    status,
    limit = DEFAULT_LIMIT,
    rig,
    search,
    assignee,
    priority,
    enabled = true,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
  } = options;

  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextPollRef = useRef(false);

  // Build query params
  const buildQueryParams = useCallback(
    (cursorOverride?: string | null) => {
      const params = new URLSearchParams();

      // Handle single status or array of statuses
      const statuses = Array.isArray(status) ? status : [status];
      // For now, use the first status (API needs to support multiple)
      // TODO: Support multiple statuses in API
      if (statuses.length === 1) {
        params.set('status', statuses[0]);
      }

      params.set('limit', String(limit));

      if (cursorOverride) {
        params.set('cursor', cursorOverride);
      }

      if (rig) {
        params.set('rig', rig);
      }

      if (search) {
        params.set('search', search);
      }

      if (assignee) {
        params.set('assignee', assignee);
      }

      if (priority !== undefined) {
        params.set('priority', String(priority));
      }

      return params.toString();
    },
    [status, limit, rig, search, assignee, priority]
  );

  // Fetch issues
  const fetchIssues = useCallback(
    async (isPolling = false, loadingMore = false) => {
      // Skip polling if an optimistic update just happened
      if (isPolling && skipNextPollRef.current) {
        skipNextPollRef.current = false;
        return;
      }

      try {
        const cursorToUse = loadingMore ? cursor : null;
        const queryString = buildQueryParams(cursorToUse);
        const response = await fetch(`/api/beads/issues/list?${queryString}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch issues: ${response.statusText}`);
        }

        const data: PaginatedResponse = await response.json();

        if (loadingMore) {
          // Append to existing issues, avoiding duplicates
          setIssues((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newIssues = data.issues.filter((i) => !existingIds.has(i.id));
            return [...prev, ...newIssues];
          });
        } else {
          setIssues(data.issues);
        }

        setTotal(data.total);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [buildQueryParams, cursor]
  );

  // Initial fetch and polling
  useEffect(() => {
    if (!enabled) return;

    setIsLoading(true);
    fetchIssues();

    // Set up polling
    if (pollingInterval > 0) {
      intervalRef.current = setInterval(() => fetchIssues(true), pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollingInterval, buildQueryParams]); // Note: fetchIssues excluded to avoid infinite loop

  // Refresh function (manual refresh)
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setCursor(null);
    await fetchIssues(false, false);
  }, [fetchIssues]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    await fetchIssues(false, true);
  }, [hasMore, isLoadingMore, fetchIssues]);

  // Optimistic update for a single issue
  const updateIssue = useCallback(
    (issueId: string, updates: Partial<Issue>) => {
      skipNextPollRef.current = true;
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, ...updates } : issue
        )
      );
    },
    []
  );

  return {
    issues,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    updateIssue,
  };
}

/**
 * Hook to fetch issues for all kanban statuses at once
 * Useful when you need coordinated updates across columns
 */
export function useKanbanIssues(options: Omit<UsePaginatedIssuesOptions, 'status'> = {}) {
  const openIssues = usePaginatedIssues({ ...options, status: 'open' });
  const inProgressIssues = usePaginatedIssues({
    ...options,
    status: 'in_progress',
  });
  const blockedIssues = usePaginatedIssues({ ...options, status: 'blocked' });
  const closedIssues = usePaginatedIssues({ ...options, status: 'closed' });

  // Combined update function that updates across all columns
  const updateIssue = useCallback(
    (issueId: string, updates: Partial<Issue>) => {
      openIssues.updateIssue(issueId, updates);
      inProgressIssues.updateIssue(issueId, updates);
      blockedIssues.updateIssue(issueId, updates);
      closedIssues.updateIssue(issueId, updates);
    },
    [openIssues, inProgressIssues, blockedIssues, closedIssues]
  );

  // Combined refresh
  const refresh = useCallback(async () => {
    await Promise.all([
      openIssues.refresh(),
      inProgressIssues.refresh(),
      blockedIssues.refresh(),
      closedIssues.refresh(),
    ]);
  }, [openIssues, inProgressIssues, blockedIssues, closedIssues]);

  return {
    columns: {
      open: openIssues,
      in_progress: inProgressIssues,
      blocked: blockedIssues,
      closed: closedIssues,
    },
    updateIssue,
    refresh,
    isLoading:
      openIssues.isLoading ||
      inProgressIssues.isLoading ||
      blockedIssues.isLoading ||
      closedIssues.isLoading,
    error:
      openIssues.error ||
      inProgressIssues.error ||
      blockedIssues.error ||
      closedIssues.error,
  };
}
