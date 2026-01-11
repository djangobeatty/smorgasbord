/**
 * React hook for Mayor status and nudge functionality
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MayorState } from '@/types/mayor';

export interface UseMayorStatusOptions {
  pollingInterval?: number;
  enabled?: boolean;
}

export interface UseMayorStatusResult {
  mayorState: MayorState | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  sendNudge: (message: string) => Promise<void>;
}

const DEFAULT_POLLING_INTERVAL = 5000;

export function useMayorStatus(options: UseMayorStatusOptions = {}): UseMayorStatusResult {
  const { pollingInterval = DEFAULT_POLLING_INTERVAL, enabled = true } = options;

  const [mayorState, setMayorState] = useState<MayorState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/mayor/status');

      if (!response.ok) {
        throw new Error(`Failed to fetch Mayor status: ${response.statusText}`);
      }

      const result = await response.json();
      setMayorState(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  const sendNudge = useCallback(async (message: string) => {
    const response = await fetch('/api/mayor/nudge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Failed to send nudge: ${response.statusText}`);
    }

    // Refresh status after nudge
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchStatus();

    // Set up polling
    if (pollingInterval > 0) {
      intervalRef.current = setInterval(fetchStatus, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollingInterval, fetchStatus]);

  return { mayorState, isLoading, error, refresh, sendNudge };
}
