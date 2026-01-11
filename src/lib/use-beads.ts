/**
 * React hook for consuming beads data
 * Provides easy access to beads API with automatic polling and caching
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BeadsData } from '@/types/beads';

export interface UseBeadsOptions {
  pollingInterval?: number;
  enabled?: boolean;
  rig?: string;
}

export interface UseBeadsResult {
  data: BeadsData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const DEFAULT_POLLING_INTERVAL = 5000;

export function useBeads(options: UseBeadsOptions = {}): UseBeadsResult {
  const { pollingInterval = DEFAULT_POLLING_INTERVAL, enabled = true, rig } = options;

  const [data, setData] = useState<BeadsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const url = rig ? `/api/beads?rig=${encodeURIComponent(rig)}` : '/api/beads';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch beads data: ${response.statusText}`);
      }

      const result = await response.json();
      setData({
        issues: result.issues ?? [],
        convoys: result.convoys ?? [],
        polecats: result.polecats ?? [],
        witnesses: result.witnesses ?? [],
        rigs: result.rigs ?? [],
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [rig]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Set up polling
    if (pollingInterval > 0) {
      intervalRef.current = setInterval(fetchData, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollingInterval, fetchData]);

  return { data, isLoading, error, refresh };
}

/**
 * Hook for fetching just issues
 */
export function useIssues(rig?: string) {
  const { data, isLoading, error, refresh } = useBeads({ rig });
  return {
    issues: data?.issues ?? [],
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching just polecats
 */
export function usePolecats(rig?: string) {
  const { data, isLoading, error, refresh } = useBeads({ rig });
  return {
    polecats: data?.polecats ?? [],
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching just rigs
 */
export function useRigs() {
  const { data, isLoading, error, refresh } = useBeads();
  return {
    rigs: data?.rigs ?? [],
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching just convoys
 */
export function useConvoys() {
  const { data, isLoading, error, refresh } = useBeads();
  return {
    convoys: data?.convoys ?? [],
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching just witnesses
 */
export function useWitnesses(rig?: string) {
  const { data, isLoading, error, refresh } = useBeads({ rig });
  return {
    witnesses: data?.witnesses ?? [],
    isLoading,
    error,
    refresh,
  };
}
