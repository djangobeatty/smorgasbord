'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RigStatus } from '@/types/rigs';

export interface UseRigsResult {
  rigs: RigStatus[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addRig: (name: string, gitUrl: string, prefix?: string) => Promise<void>;
  removeRig: (name: string) => Promise<void>;
  startRig: (name: string) => Promise<void>;
  stopRig: (name: string) => Promise<void>;
  parkRig: (name: string) => Promise<void>;
  unparkRig: (name: string) => Promise<void>;
}

export function useRigs(): UseRigsResult {
  const [rigs, setRigs] = useState<RigStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRigs = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rigs');
      if (!response.ok) {
        throw new Error(`Failed to fetch rigs: ${response.statusText}`);
      }
      const data = await response.json();
      setRigs(data.rigs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addRig = useCallback(async (name: string, gitUrl: string, prefix?: string) => {
    try {
      const response = await fetch('/api/rigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gitUrl, prefix }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add rig');
      }
      await fetchRigs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, [fetchRigs]);

  const removeRig = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/rigs/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove rig');
      }
      await fetchRigs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, [fetchRigs]);

  const startRig = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/rigs/${encodeURIComponent(name)}/start`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start rig');
      }
      // Refresh to get updated status
      await fetchRigs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, [fetchRigs]);

  const stopRig = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/rigs/${encodeURIComponent(name)}/stop`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to stop rig');
      }
      await fetchRigs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, [fetchRigs]);

  const parkRig = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/rigs/${encodeURIComponent(name)}/park`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to park rig');
      }
      await fetchRigs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, [fetchRigs]);

  const unparkRig = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/rigs/${encodeURIComponent(name)}/unpark`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unpark rig');
      }
      await fetchRigs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, [fetchRigs]);

  useEffect(() => {
    fetchRigs();
  }, [fetchRigs]);

  return {
    rigs,
    isLoading,
    error,
    refresh: fetchRigs,
    addRig,
    removeRig,
    startRig,
    stopRig,
    parkRig,
    unparkRig,
  };
}
