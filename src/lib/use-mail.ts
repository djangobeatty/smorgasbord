/**
 * React hook for mail conversations
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { MailMessage, MailboxState, MailThread } from '@/types/mail';

export interface UseMailboxOptions {
  address?: string;
  pollingInterval?: number;
  enabled?: boolean;
}

export interface UseMailboxResult {
  mailbox: MailboxState;
  threads: MailThread[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMessages: MailMessage[];
}

const DEFAULT_POLLING_INTERVAL = 10000;

/**
 * Normalize mail addresses to handle inconsistent formats
 * - "mayor" -> "mayor/" (town agents need trailing slash)
 * - "deacon" -> "deacon/"
 * - "mayor/" -> "mayor/" (already correct)
 * - "deck_editor/witness" -> "deck_editor/witness" (rig/agent format stays as-is)
 */
export function normalizeAddress(address: string): string {
  if (!address) return address;

  // Known town agents that should have trailing slash and lowercase
  const townAgents = ['mayor', 'deacon', 'overseer'];
  const lowerAddr = address.toLowerCase().replace(/\/$/, ''); // remove trailing slash for comparison

  // If it's a town agent (with or without slash), normalize to lowercase with slash
  if (townAgents.includes(lowerAddr)) {
    return `${lowerAddr}/`;
  }

  // If it has format "rig/name", keep it as-is
  return address;
}

/**
 * Group messages into conversations by participant
 * All messages to/from the same person are grouped together regardless of subject
 */
function groupIntoThreads(allMessages: MailMessage[], myAddress = 'overseer'): MailThread[] {
  if (allMessages.length === 0) return [];

  // Group by the OTHER participant (not overseer)
  const conversationMap = new Map<string, MailMessage[]>();
  for (const msg of allMessages) {
    // Get the other participant (the one that isn't overseer)
    // Normalize addresses to handle format inconsistencies (e.g., "deacon" vs "deacon/")
    const rawParticipant = msg.from === myAddress ? msg.to : msg.from;
    const otherParticipant = normalizeAddress(rawParticipant);
    const existing = conversationMap.get(otherParticipant) || [];
    existing.push(msg);
    conversationMap.set(otherParticipant, existing);
  }

  const threads: MailThread[] = [];

  for (const [participant, messages] of conversationMap) {
    // Sort by timestamp (oldest first for reading order)
    messages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const unreadCount = messages.filter(m => !m.read).length;
    const latestMsg = messages[messages.length - 1];

    threads.push({
      id: participant, // Use participant as conversation ID
      subject: participant, // Display participant name as "subject"
      messages,
      latestTimestamp: latestMsg.timestamp,
      unreadCount,
      participants: [myAddress, participant],
    });
  }

  // Sort conversations by most recent message (newest first)
  threads.sort((a, b) =>
    new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
  );

  return threads;
}

export function useMailbox(options: UseMailboxOptions = {}): UseMailboxResult {
  const {
    address = 'overseer',
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    enabled = true
  } = options;

  const [mailbox, setMailbox] = useState<MailboxState>({ messages: [], unreadCount: 0 });
  const [sent, setSent] = useState<MailMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInbox = useCallback(async () => {
    try {
      const response = await fetch(`/api/mail/inbox?address=${encodeURIComponent(address)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch inbox: ${response.statusText}`);
      }

      const result = await response.json();
      setMailbox({
        messages: result.messages || [],
        unreadCount: result.unreadCount || 0,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [address]);

  const fetchSent = useCallback(async () => {
    try {
      const response = await fetch('/api/mail/sent');

      if (!response.ok) {
        throw new Error(`Failed to fetch sent: ${response.statusText}`);
      }

      const result = await response.json();
      setSent(result.messages || []);
    } catch (err) {
      console.error('Failed to fetch sent messages:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchInbox(), fetchSent()]);
    setIsLoading(false);
  }, [fetchInbox, fetchSent]);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      const response = await fetch('/api/mail/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });

      if (response.ok) {
        // Optimistically update local state
        setMailbox((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            messageIds.includes(m.id) ? { ...m, read: true } : m
          ),
          unreadCount: Math.max(0, prev.unreadCount - messageIds.length),
        }));
      }
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    refresh();

    // Set up polling
    if (pollingInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchInbox();
        fetchSent();
      }, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollingInterval, fetchInbox, fetchSent, refresh]);

  // Merge inbox and sent for complete conversation threads
  const allMessages = useMemo(() => {
    const combined = [...mailbox.messages, ...sent];
    // Dedupe by id in case any overlap
    const seen = new Set<string>();
    return combined.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [mailbox.messages, sent]);

  // Group all messages into conversations by participant
  const threads = useMemo(() => groupIntoThreads(allMessages), [allMessages]);

  // Filter messages based on search query (searches all messages)
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return allMessages;

    const query = searchQuery.toLowerCase();
    return allMessages.filter(msg =>
      msg.subject.toLowerCase().includes(query) ||
      msg.body.toLowerCase().includes(query) ||
      msg.from.toLowerCase().includes(query) ||
      msg.to.toLowerCase().includes(query)
    );
  }, [allMessages, searchQuery]);

  return {
    mailbox,
    threads,
    isLoading,
    error,
    refresh,
    markAsRead,
    searchQuery,
    setSearchQuery,
    filteredMessages,
  };
}
