'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CrewState, CrewMember, CrewMessage } from '@/types/crew';

interface UseCrewOptions {
  pollInterval?: number;
}

interface UseCrewResult {
  crewState: CrewState | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  sendMail: (to: string, subject: string, message: string) => Promise<void>;
}

export function useCrewStatus(options: UseCrewOptions = {}): UseCrewResult {
  const { pollInterval = 10000 } = options;

  const [crewState, setCrewState] = useState<CrewState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/crew');
      if (!response.ok) {
        throw new Error('Failed to fetch crew status');
      }
      const data: CrewState = await response.json();
      setCrewState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMail = useCallback(async (to: string, subject: string, message: string) => {
    const response = await fetch('/api/crew/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, message }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send mail');
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    if (pollInterval > 0) {
      const interval = setInterval(fetchStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, pollInterval]);

  return {
    crewState,
    isLoading,
    error,
    refresh: fetchStatus,
    sendMail,
  };
}

interface UseCrewInboxOptions {
  member: string;
  pollInterval?: number;
}

interface UseCrewInboxResult {
  messages: CrewMessage[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCrewInbox(options: UseCrewInboxOptions): UseCrewInboxResult {
  const { member, pollInterval = 5000 } = options;

  const [messages, setMessages] = useState<CrewMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInbox = useCallback(async () => {
    if (!member) return;

    try {
      const response = await fetch(`/api/crew/mail/inbox?member=${encodeURIComponent(member)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inbox');
      }
      const data = await response.json();
      setMessages(data.messages || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [member]);

  useEffect(() => {
    fetchInbox();

    if (pollInterval > 0) {
      const interval = setInterval(fetchInbox, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchInbox, pollInterval]);

  return {
    messages,
    unreadCount,
    isLoading,
    error,
    refresh: fetchInbox,
  };
}
