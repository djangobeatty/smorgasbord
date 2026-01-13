'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useMailbox, normalizeAddress } from '@/lib/use-mail';
import { useCrewStatus } from '@/lib/use-crew';
import { usePolecats, useRefineries, useWitnesses } from '@/lib/use-beads';
import { useGtStatus } from '@/lib/use-gt-status';
import { useFeature } from '@/lib/project-mode';
import { NavBar } from '@/components/layout';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { MailMessage, MailThread } from '@/types/mail';

interface Recipient {
  address: string;
  label: string;
  type: 'town' | 'crew' | 'refinery' | 'polecat' | 'witness';
  status: 'active' | 'idle' | 'stopped' | 'running' | 'error' | 'processing';
}

// Status dot colors - keep explicit for semantic meaning
const statusColors: Record<Recipient['status'], string> = {
  active: 'bg-green-500',
  running: 'bg-green-500',
  processing: 'bg-primary animate-pulse',
  idle: 'bg-yellow-500',
  stopped: 'bg-muted-foreground',
  error: 'bg-destructive',
};

// Highlight search terms in text
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

interface MessageCardProps {
  message: MailMessage;
  isSelected: boolean;
  onSelect: () => void;
  showTo?: boolean; // Show "to" instead of "from" for sent folder
  searchQuery?: string;
}

function MessageCard({ message, isSelected, onSelect, showTo, searchQuery = '' }: MessageCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg border p-4 cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/50',
        !message.read && 'border-l-4 border-l-primary'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {!message.read && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
          <span className="font-medium text-foreground">
            {showTo ? (
              <>To: <HighlightText text={message.to} query={searchQuery} /></>
            ) : (
              <HighlightText text={message.from} query={searchQuery} />
            )}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
      <p className="text-sm text-foreground truncate">
        <HighlightText text={message.subject} query={searchQuery} />
      </p>
      {message.body && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          <HighlightText text={message.body.slice(0, 100)} query={searchQuery} />
        </p>
      )}
    </div>
  );
}


interface ThreadDetailProps {
  thread: MailThread | null;
  onClose: () => void;
  onReply: (message: MailMessage) => void;
  searchQuery?: string;
}

function ThreadDetail({ thread, onClose, onReply, searchQuery = '' }: ThreadDetailProps) {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Count total matches in thread
  const matchCount = useMemo(() => {
    if (!thread || !searchQuery.trim()) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let count = 0;
    for (const msg of thread.messages) {
      const bodyMatches = msg.body?.match(regex) || [];
      const subjectMatches = msg.subject?.match(regex) || [];
      count += bodyMatches.length + subjectMatches.length;
    }
    return count;
  }, [thread, searchQuery]);

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
    matchRefs.current = [];
  }, [searchQuery, thread?.id]);

  // Scroll to current match
  useEffect(() => {
    if (matchCount > 0 && matchRefs.current[currentMatchIndex]) {
      matchRefs.current[currentMatchIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentMatchIndex, matchCount]);

  const goToNextMatch = useCallback(() => {
    if (matchCount > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
    }
  }, [matchCount]);

  const goToPrevMatch = useCallback(() => {
    if (matchCount > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
    }
  }, [matchCount]);

  // Highlight with ref tracking for navigation
  let globalMatchIndex = 0;
  const HighlightWithRefs = ({ text }: { text: string }) => {
    if (!searchQuery.trim()) return <>{text}</>;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          if (regex.test(part)) {
            const matchIdx = globalMatchIndex++;
            const isCurrent = matchIdx === currentMatchIndex;
            return (
              <mark
                key={i}
                ref={(el) => { matchRefs.current[matchIdx] = el; }}
                className={cn(
                  'text-inherit rounded px-0.5',
                  isCurrent
                    ? 'bg-orange-400 dark:bg-orange-500/50 ring-2 ring-orange-500'
                    : 'bg-yellow-200 dark:bg-yellow-500/30'
                )}
              >
                {part}
              </mark>
            );
          }
          return part;
        })}
      </>
    );
  };

  if (!thread) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a conversation to view</p>
      </div>
    );
  }

  const latestMessage = thread.messages[thread.messages.length - 1];
  const otherParticipant = thread.participants.find(p => p !== 'overseer') || thread.subject;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm h-full flex flex-col">
      {/* Conversation Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground font-mono">
              {otherParticipant}
            </h3>
            <p className="text-sm text-muted-foreground">
              {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReply(latestMessage)}
              className="px-3 py-1.5 text-sm font-medium text-secondary-foreground bg-secondary hover:bg-accent rounded transition-colors"
            >
              Reply
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search navigation bar */}
      {searchQuery.trim() && matchCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-yellow-50 dark:bg-yellow-500/10 border-b border-yellow-200 dark:border-yellow-500/30">
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            {currentMatchIndex + 1} of {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevMatch}
              className="p-1.5 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 rounded transition-colors"
              title="Previous match"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={goToNextMatch}
              className="p-1.5 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 rounded transition-colors"
              title="Next match"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* All Messages - newest first */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-3">
        {[...thread.messages].reverse().map((msg) => {
          const isFromMe = msg.from === 'overseer';
          return (
            <div
              key={msg.id}
              className={cn(
                'rounded-lg p-3 border max-w-[85%]',
                isFromMe
                  ? 'bg-primary/10 border-primary/30 ml-auto'
                  : 'bg-muted border-border mr-auto'
              )}
            >
              {msg.subject && (
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  <HighlightWithRefs text={msg.subject} />
                </p>
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {msg.body ? <HighlightWithRefs text={msg.body} /> : '(No content)'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {formatRelativeTime(msg.timestamp)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: MailMessage;
  recipients: Recipient[];
  recipientsLoading?: boolean;
  onSend: (to: string, subject: string, body: string, replyToId?: string) => Promise<void>;
}

function ComposeModal({ isOpen, onClose, replyTo, recipients, recipientsLoading, onSend }: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedRecipient = recipients.find((r) => r.address === to);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Update form fields when replyTo changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setIsDropdownOpen(false);
      // Determine recipient: if the message was from me, reply to the 'to' field, otherwise reply to 'from'
      const replyRecipient = replyTo?.from === 'overseer' ? replyTo?.to : replyTo?.from;
      // Normalize address to match recipients list format (e.g., "mayor" -> "mayor/")
      setTo(replyRecipient ? normalizeAddress(replyRecipient) : '');
      setSubject(replyTo ? `Re: ${replyTo.subject}` : '');
      setBody('');
    }
  }, [isOpen, replyTo]);

  const handleSend = async () => {
    if (!to.trim() || !body.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await onSend(to, subject, body, replyTo?.id);
      setTo('');
      setSubject('');
      setBody('');
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-popover shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">
            {replyTo ? 'Reply to Message' : 'Compose Message'}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 p-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-foreground">
              To
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                'mt-1 w-full rounded-md border px-3 py-2 text-sm text-left flex items-center justify-between',
                'bg-input border-input',
                'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
                !selectedRecipient && 'text-muted-foreground'
              )}
            >
              {selectedRecipient ? (
                <span className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', statusColors[selectedRecipient.status])} />
                  <span className="text-foreground">{selectedRecipient.address}</span>
                  <span className="text-muted-foreground text-xs">
                    ({selectedRecipient.type})
                  </span>
                </span>
              ) : recipientsLoading ? (
                'Loading recipients...'
              ) : (
                'Select recipient...'
              )}
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (() => {
              if (recipientsLoading) {
                return (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                    <div className="px-3 py-2 text-sm text-muted-foreground">Loading recipients...</div>
                  </div>
                );
              }

              const availableRecipients = recipients.filter((r) => r.status !== 'error');
              const activeRecipients = availableRecipients.filter(
                (r) => r.status === 'active' || r.status === 'running' || r.status === 'processing'
              );
              const idleRecipients = availableRecipients.filter((r) => r.status === 'idle');
              const stoppedRecipients = availableRecipients.filter((r) => r.status === 'stopped');

              return (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                  {availableRecipients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No recipients available</div>
                  ) : (
                    <>
                      {activeRecipients.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 border-b border-border">
                            Active
                          </div>
                          {activeRecipients.map((r) => (
                            <button
                              key={r.address}
                              type="button"
                              onClick={() => { setTo(r.address); setIsDropdownOpen(false); }}
                              className={cn(
                                'w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent',
                                to === r.address && 'bg-primary/10'
                              )}
                            >
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[r.status])} />
                              <span className="flex-1 text-foreground truncate">{r.address}</span>
                              <span className="text-muted-foreground text-xs flex-shrink-0">{r.type}</span>
                            </button>
                          ))}
                        </>
                      )}

                      {idleRecipients.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-b border-border">
                            Idle
                          </div>
                          {idleRecipients.map((r) => (
                            <button
                              key={r.address}
                              type="button"
                              onClick={() => { setTo(r.address); setIsDropdownOpen(false); }}
                              className={cn(
                                'w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent',
                                to === r.address && 'bg-primary/10'
                              )}
                            >
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[r.status])} />
                              <span className="flex-1 text-foreground truncate">{r.address}</span>
                              <span className="text-muted-foreground text-xs flex-shrink-0">{r.type}</span>
                            </button>
                          ))}
                        </>
                      )}

                      {stoppedRecipients.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted border-b border-border">
                            Stopped (mail delivered on restart)
                          </div>
                          {stoppedRecipients.map((r) => (
                            <button
                              key={r.address}
                              type="button"
                              onClick={() => { setTo(r.address); setIsDropdownOpen(false); }}
                              className={cn(
                                'w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent',
                                to === r.address && 'bg-primary/10'
                              )}
                            >
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[r.status])} />
                              <span className="flex-1 text-foreground truncate">{r.address}</span>
                              <span className="text-muted-foreground text-xs flex-shrink-0">{r.type}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Subject <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject"
              className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message..."
              rows={8}
              className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {replyTo && (
            <div className="rounded-md border border-border bg-muted p-3">
              <p className="text-xs text-muted-foreground">Replying to:</p>
              <p className="mt-1 text-sm text-foreground">
                <span className="font-medium">{replyTo.from}:</span> {replyTo.subject}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button
            onClick={onClose}
            disabled={isSending}
            className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !to.trim() || !body.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MailboxPage() {
  const hasMailbox = useFeature('controlPlane');
  const {
    mailbox,
    threads,
    searchQuery,
    setSearchQuery,
    filteredMessages,
    isLoading,
    error,
    refresh,
    markAsRead,
  } = useMailbox();
  const { crewState } = useCrewStatus({ pollInterval: 30000 });
  const { status: gtStatus, isLoading: gtLoading } = useGtStatus({ pollingInterval: 30000 });
  const { polecats } = usePolecats();
  const { refineries } = useRefineries();
  const { witnesses } = useWitnesses();
  // Consider loading until we have actual data (not just isLoading states)
  // This handles fast API responses where isLoading might flip to false very quickly
  const recipientsLoading = gtLoading || !gtStatus;
  const [selectedThread, setSelectedThread] = useState<MailThread | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<MailMessage | undefined>(undefined);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get mayor and deacon status from gt status
  const mayorAgent = gtStatus?.agents?.find(
    (a) => a.name.toLowerCase() === 'mayor' || a.role === 'coordinator' || a.role === 'mayor'
  );
  const deaconAgent = gtStatus?.agents?.find(
    (a) => a.name.toLowerCase() === 'deacon' || a.role === 'health-check' || a.role === 'deacon'
  );
  const mayorRunning = mayorAgent?.running ?? false;
  const deaconRunning = deaconAgent?.running ?? false;

  // Build recipients list from all mailable entities
  // Return empty list while loading to avoid showing partial/wrong data
  const recipients = useMemo<Recipient[]>(() => {
    if (recipientsLoading) return [];

    const list: Recipient[] = [
      { address: 'mayor/', label: 'Mayor', type: 'town', status: mayorRunning ? 'running' : 'stopped' },
      { address: 'deacon/', label: 'Deacon', type: 'town', status: deaconRunning ? 'running' : 'stopped' },
    ];

    if (crewState?.members) {
      for (const member of crewState.members) {
        list.push({
          address: `${member.rig}/${member.name}`,
          label: member.name,
          type: 'crew',
          status: member.status === 'running' ? 'running' : member.status === 'error' ? 'error' : 'stopped',
        });
      }
    }

    for (const polecat of polecats) {
      list.push({
        address: `${polecat.rig}/${polecat.name}`,
        label: polecat.name,
        type: 'polecat',
        status: polecat.status === 'active' ? 'active' : polecat.status === 'idle' ? 'idle' : 'stopped',
      });
    }

    for (const refinery of refineries) {
      list.push({
        address: `${refinery.rig}/${refinery.name}`,
        label: refinery.name,
        type: 'refinery',
        status: refinery.status === 'processing' ? 'processing' : refinery.status === 'active' ? 'active' : refinery.status === 'error' ? 'error' : 'idle',
      });
    }

    for (const witness of witnesses) {
      list.push({
        address: `${witness.rig}/witness`,
        label: `${witness.rig} witness`,
        type: 'witness',
        status: witness.status === 'active' ? 'active' : witness.status === 'idle' ? 'idle' : 'stopped',
      });
    }

    const statusOrder = { active: 0, running: 0, processing: 1, idle: 2, stopped: 3, error: 4 };
    list.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return list;
  }, [recipientsLoading, gtStatus, mayorRunning, deaconRunning, crewState, polecats, refineries, witnesses]);

  const handleReply = useCallback((message: MailMessage) => {
    setReplyToMessage(message);
    setIsComposeOpen(true);
  }, []);

  const handleCompose = useCallback(() => {
    setReplyToMessage(undefined);
    setIsComposeOpen(true);
  }, []);

  const handleCloseCompose = useCallback(() => {
    setIsComposeOpen(false);
    setReplyToMessage(undefined);
  }, []);

  const handleSendMessage = useCallback(async (to: string, subject: string, body: string, replyToId?: string) => {
    setSendStatus(null);

    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, replyTo: replyToId }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSendStatus({ type: 'success', text: `Message sent to ${to}` });

      setTimeout(() => {
        refresh();
        setSendStatus(null);
      }, 2000);
    } catch (error) {
      setSendStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send message',
      });
      throw error;
    }
  }, [refresh]);

  // Find thread by message id (for search results)
  const findThreadForMessage = useCallback((messageId: string): MailThread | null => {
    return threads.find(t => t.messages.some(m => m.id === messageId)) || null;
  }, [threads]);

  // Keep selectedThread in sync when threads update (e.g., after sending a message)
  useEffect(() => {
    if (selectedThread) {
      // Try exact match first, then normalized match (handles "deacon" -> "deacon/" transition)
      const normalizedId = normalizeAddress(selectedThread.id);
      const updatedThread = threads.find(t => t.id === selectedThread.id || t.id === normalizedId);
      if (updatedThread && updatedThread !== selectedThread) {
        setSelectedThread(updatedThread);
      }
    }
  }, [threads, selectedThread]);

  // Automatically mark messages as read when viewing a thread
  useEffect(() => {
    if (selectedThread && selectedThread.unreadCount > 0) {
      const unreadIds = selectedThread.messages
        .filter((m) => !m.read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  }, [selectedThread, markAsRead]);

  // Feature not available in current mode
  if (!hasMailbox) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">
              Comms Not Available
            </h2>
            <p className="mt-2 text-muted-foreground">
              Comms is only available in Gas Town mode.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const showThreads = !searchQuery.trim(); // Show flat list when searching

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Comms
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conversations with Gas Town agents
            </p>
          </div>

          <div className="flex items-center gap-3">
            {mailbox.unreadCount > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/30">
                {mailbox.unreadCount} unread
              </span>
            )}
            <button
              onClick={handleCompose}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              <svg className="inline-block w-4 h-4 mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Compose
            </button>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-4 py-2 text-sm rounded-md bg-secondary hover:bg-accent text-secondary-foreground transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="max-w-md">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-input bg-input text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Send Status Message */}
        {sendStatus && (
          <div
            className={cn(
              'mb-4 rounded-md border p-3',
              sendStatus.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            )}
          >
            {sendStatus.text}
          </div>
        )}

        {/* Content */}
        {isLoading && threads.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading comms...</div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-destructive">Error loading comms: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && threads.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-muted-foreground">
              {searchQuery ? 'No messages match your search' : 'No conversations yet'}
            </p>
          </div>
        )}

        {!error && threads.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Thread List */}
            <div className="space-y-3">
              {showThreads ? (
                // Show threaded view
                threads.map((thread) => {
                  const latestMsg = thread.messages[thread.messages.length - 1];
                  const isFromMe = latestMsg.from === 'overseer';
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={cn(
                        'rounded-lg border p-4 cursor-pointer transition-all',
                        selectedThread?.id === thread.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/50',
                        thread.unreadCount > 0 && 'border-l-4 border-l-primary'
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {thread.unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                          <span className="font-medium text-foreground font-mono text-sm">
                            {thread.subject}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                            {thread.messages.length}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(thread.latestTimestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {isFromMe ? 'You: ' : ''}{latestMsg.body.slice(0, 80)}
                      </p>
                    </div>
                  );
                })
              ) : (
                // Show flat list when searching - clicking opens the thread
                filteredMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    isSelected={selectedThread?.messages.some(m => m.id === message.id) || false}
                    onSelect={() => setSelectedThread(findThreadForMessage(message.id))}
                    showTo={message.from === 'overseer'}
                    searchQuery={searchQuery}
                  />
                ))
              )}
            </div>

            {/* Thread Detail - shows full conversation */}
            <div className="lg:sticky lg:top-8 lg:h-[calc(100vh-12rem)]">
              <ThreadDetail
                thread={selectedThread}
                onClose={() => setSelectedThread(null)}
                onReply={handleReply}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        )}

        {/* Compose Modal */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={handleCloseCompose}
          replyTo={replyToMessage}
          recipients={recipients}
          recipientsLoading={recipientsLoading}
          onSend={handleSendMessage}
        />
      </main>
    </div>
  );
}
