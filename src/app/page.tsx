'use client';

import { useState, useCallback, useEffect } from 'react';
import { useBeads, useConvoys, usePolecats } from '@/lib/use-beads';
import { useGtStatus } from '@/lib/use-gt-status';
import { FeatureGate } from '@/lib/project-mode';
import { useTheme } from '@/lib/theme-provider';
import { NavBar } from '@/components/layout';
import type { Convoy, Issue, Polecat } from '@/types/beads';
import type { GtRig, GtAgent } from '@/types/gt-status';
import type { CrewState, CrewMember } from '@/types/crew';
import type { MailMessage } from '@/types/mail';
import Link from 'next/link';

/**
 * Check if a bead is a project work item (not internal system bead)
 * Only show task/feature/bug/convoy that aren't wisps
 */
function isProjectBead(issue: Issue): boolean {
  // Wisps are always internal regardless of type
  if (issue.id.includes('-wisp-')) return false;
  // Digests are squashed molecules
  if (issue.title.startsWith('Digest: ')) return false;
  // Only these types are project work
  const projectTypes = ['task', 'feature', 'bug', 'convoy'];
  return projectTypes.includes(issue.issue_type);
}

interface CrewMemberDisplay {
  name: string;
  rig: string;
  running: boolean;
  has_work: boolean;
  unread_mail: number;
  first_subject?: string;
  branch?: string;
  gitStatus?: 'clean' | 'dirty';
}

export default function Dashboard() {
  const { data, isLoading: beadsLoading, refresh: refreshBeads } = useBeads();
  const { convoys, isLoading: convoysLoading, refresh: refreshConvoys } = useConvoys();
  const { polecats, isLoading: polecatsLoading } = usePolecats();
  const { status: gtStatus, isLoading: gtLoading } = useGtStatus();
  const { theme } = useTheme();

  const isLoading = beadsLoading || convoysLoading || polecatsLoading || gtLoading;
  const isKawaii = theme === 'smorgasbord';

  // Mail modal state
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mayor nudge state
  const [mayorNudgeMessage, setMayorNudgeMessage] = useState('');
  const [isSendingMayorNudge, setIsSendingMayorNudge] = useState(false);

  // Crew messaging state - per-crew messages
  const [crewMessages, setCrewMessages] = useState<Record<string, string>>({});
  const [sendingCrewMessage, setSendingCrewMessage] = useState<string | null>(null);

  // Crew details (branch, git status) from /api/crew
  const [crewDetails, setCrewDetails] = useState<CrewMember[]>([]);

  // Inbox messages state
  const [inboxMessages, setInboxMessages] = useState<MailMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Agent activity state
  const [agentActivities, setAgentActivities] = useState<Array<{
    session: string;
    name: string;
    role: string;
    activity: string;
    activities: string[];
    duration?: string;
    tool?: string;
  }>>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Fetch crew details for branch info
  useEffect(() => {
    const fetchCrewDetails = async () => {
      try {
        const response = await fetch('/api/crew');
        if (response.ok) {
          const data: CrewState = await response.json();
          setCrewDetails(data.members || []);
        }
      } catch (error) {
        console.error('Error fetching crew details:', error);
      }
    };
    fetchCrewDetails();
    // Re-fetch every 10 seconds
    const interval = setInterval(fetchCrewDetails, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch inbox messages
  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const response = await fetch('/api/mail/inbox');
        if (response.ok) {
          const data = await response.json();
          setInboxMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error fetching inbox:', error);
      } finally {
        setInboxLoading(false);
      }
    };
    fetchInbox();
    // Re-fetch every 10 seconds
    const interval = setInterval(fetchInbox, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch agent activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/agents/activity');
        if (response.ok) {
          const data = await response.json();
          setAgentActivities(data.activities || []);
        }
      } catch (error) {
        console.error('Error fetching agent activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
    };
    fetchActivities();
    // Re-fetch every 5 seconds for real-time updates
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([refreshBeads(), refreshConvoys()]);
  }, [refreshBeads, refreshConvoys]);

  // Mayor mail handler
  const handleOpenMayorMail = () => {
    setMailSubject('');
    setMailBody('');
    setIsMailModalOpen(true);
  };

  const handleSendMail = async () => {
    if (!mailBody) {
      setActionStatus({ type: 'error', text: 'Please enter a message' });
      return;
    }

    setIsSendingMail(true);
    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'mayor/',
          subject: mailSubject,
          body: mailBody,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send mail');
      }

      setActionStatus({ type: 'success', text: 'Instructions sent to Mayor' });
      setIsMailModalOpen(false);
      setMailSubject('');
      setMailBody('');
      setTimeout(() => setActionStatus(null), 3000);
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send mail',
      });
    } finally {
      setIsSendingMail(false);
    }
  };

  // Mayor nudge handler - immediate tap on mayor (message optional)
  const handleNudgeMayor = async () => {
    setIsSendingMayorNudge(true);
    try {
      const response = await fetch('/api/mayor/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: mayorNudgeMessage.trim() || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to nudge');
      }

      setActionStatus({ type: 'success', text: mayorNudgeMessage.trim() ? 'Nudged Mayor with message' : 'Nudged Mayor' });
      setMayorNudgeMessage('');
      setTimeout(() => setActionStatus(null), 3000);
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to nudge Mayor',
      });
    } finally {
      setIsSendingMayorNudge(false);
    }
  };

  // Crew mail handler - async message to crew inbox
  const handleMailCrew = async (crew: CrewMemberDisplay) => {
    const crewKey = `${crew.rig}/${crew.name}`;
    const message = crewMessages[crewKey]?.trim();
    if (!message) return;

    setSendingCrewMessage(crewKey);
    try {
      const response = await fetch('/api/crew/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `${crew.rig}/crew/${crew.name}`,
          subject: 'Dashboard Message',
          message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send mail');
      }

      setActionStatus({ type: 'success', text: `Mail sent to ${crew.name}` });
      setCrewMessages((prev) => ({ ...prev, [crewKey]: '' }));
      setTimeout(() => setActionStatus(null), 3000);
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send mail',
      });
    } finally {
      setSendingCrewMessage(null);
    }
  };

  // Crew nudge handler - immediate tap on running crew (message optional)
  const handleNudgeCrew = async (crew: CrewMemberDisplay) => {
    const crewKey = `${crew.rig}/${crew.name}`;
    const message = crewMessages[crewKey]?.trim() || '';

    setSendingCrewMessage(crewKey);
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crew.name)}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rig: crew.rig,
          message, // Empty nudge is valid
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to nudge');
      }

      setActionStatus({ type: 'success', text: `Nudged ${crew.name}` });
      setCrewMessages((prev) => ({ ...prev, [crewKey]: '' }));
      setTimeout(() => setActionStatus(null), 3000);
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to nudge',
      });
    } finally {
      setSendingCrewMessage(null);
    }
  };

  // Reply to inbox message
  const handleReplyToMessage = async (message: MailMessage) => {
    if (!replyText.trim()) return;

    setSendingReply(true);
    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: message.from,
          subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
          body: replyText.trim(),
          replyTo: message.id,
          threadId: message.threadId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reply');
      }

      setActionStatus({ type: 'success', text: `Reply sent to ${message.from}` });
      setReplyText('');
      setSelectedMessage(null);
      setTimeout(() => setActionStatus(null), 3000);
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send reply',
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // System health calculations
  const mayorAgent = gtStatus?.agents?.find(a => a.name.toLowerCase() === 'mayor' || a.role === 'coordinator');
  const deaconAgent = gtStatus?.agents?.find(a => a.name.toLowerCase() === 'deacon');
  const deaconAlive = deaconAgent?.running ?? false;
  const witnesses = data?.witnesses ?? [];
  const refineries = data?.refineries ?? [];
  const activeWitnesses = witnesses.filter(w => w.status === 'active').length;
  const activeRefineries = refineries.filter(r => r.status === 'processing' || r.status === 'active').length;

  // Active work calculations
  const activeConvoys = convoys.filter(c => c.status === 'active' || c.status === 'stalled');
  const issues = data?.issues ?? [];
  const activeIssues = issues.filter(i => (i.status === 'in_progress' || i.status === 'hooked') && isProjectBead(i));

  // Helper to find which convoy an issue belongs to
  const getConvoyForIssue = (issueId: string) => {
    return convoys.find(c => c.issues?.includes(issueId));
  };

  // Crew with active work
  const activePolecats = polecats.filter(p => p.status === 'active' && p.hooked_work);

  // Get running crew members from gtStatus, merged with branch info from /api/crew
  const crewMembers: CrewMemberDisplay[] = gtStatus?.rigs?.flatMap((rig: GtRig) =>
    rig.agents?.filter((a: GtAgent) => a.role === 'crew').map((a: GtAgent): CrewMemberDisplay => {
      // Find matching crew detail for branch info
      const detail = crewDetails.find(d => d.name === a.name && d.rig === rig.name);
      return {
        name: a.name,
        rig: rig.name,
        running: a.running,
        has_work: a.has_work,
        unread_mail: a.unread_mail || 0,
        first_subject: a.first_subject,
        branch: detail?.branch,
        gitStatus: detail?.gitStatus,
      };
    }) ?? []
  ) ?? [];
  const runningCrew = crewMembers.filter((c: CrewMemberDisplay) => c.running);

  // System health status
  const systemHealthy = deaconAlive && activeWitnesses > 0;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Give instructions → Watch progress → Get code
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {isKawaii ? (
              <span className={`text-lg ${isLoading ? 'animate-spin inline-block' : ''}`}>🔄</span>
            ) : (
              <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
        </div>

        {/* Status Message */}
        {actionStatus && (
          <div className={`mb-4 rounded-md border p-3 ${actionStatus.type === 'success' ? 'border-chart-2/50 bg-chart-2/10 text-chart-2' : 'border-destructive/50 bg-destructive/10 text-destructive'}`}>
            {actionStatus.text}
          </div>
        )}

        {/* TOP SECTION - Command Input (Mayor) */}
        <FeatureGate feature="mayor">
          <div className="mb-8">
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {isKawaii ? (
                      <span className="text-4xl">🎩</span>
                    ) : (
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-md ${gtLoading ? 'bg-muted-foreground' : mayorAgent?.running ? 'bg-primary' : 'bg-muted-foreground'}`}>
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-foreground">Mayor</h2>
                        {gtLoading ? (
                          <>
                            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground animate-pulse" />
                            <span className="text-sm font-medium text-muted-foreground">Loading...</span>
                          </>
                        ) : mayorAgent?.running ? (
                          <>
                            <div className="h-2.5 w-2.5 rounded-full bg-chart-2" />
                            <span className="text-sm font-medium text-chart-2">
                              {mayorAgent?.state === 'idle' ? 'Idle' : 'Working'}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                            <span className="text-sm font-medium text-destructive">Stopped</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Chief-of-staff coordinating all work
                      </p>
                    </div>
                  </div>
                  {/* Mayor status details */}
                  <div className="flex items-center gap-4 mt-2 ml-13">
                    {mayorAgent?.unread_mail !== undefined && mayorAgent.unread_mail > 0 && (
                      <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-primary">
                          {mayorAgent.unread_mail} unread
                        </span>
                      </div>
                    )}
                    {mayorAgent?.has_work && (
                      <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-chart-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-sm font-medium text-chart-1">
                          Has active work
                        </span>
                      </div>
                    )}
                    {mayorAgent?.first_subject && mayorAgent.unread_mail > 0 && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        Latest: "{mayorAgent.first_subject}"
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleOpenMayorMail}
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
                >
                  {isKawaii ? (
                    <span className="text-lg">📨</span>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                  Send Instructions
                </button>
              </div>
              {/* Nudge input row */}
              <div className="mt-4 flex gap-2 items-center">
                <input
                  type="text"
                  value={mayorNudgeMessage}
                  onChange={(e) => setMayorNudgeMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleNudgeMayor();
                    }
                  }}
                  placeholder="Quick message for Mayor (optional)..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  disabled={!mayorAgent?.running}
                />
                <button
                  onClick={handleNudgeMayor}
                  disabled={isSendingMayorNudge || !mayorAgent?.running}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50 transition-colors"
                  title={mayorAgent?.running ? "Tap Mayor on shoulder" : "Mayor not running"}
                >
                  👋 Nudge
                </button>
              </div>
            </div>
          </div>
        </FeatureGate>

        {/* MESSAGES SECTION - Recent Mail */}
        {(inboxLoading || inboxMessages.length > 0) && (
          <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isKawaii ? (
                  <span className="text-xl">💌</span>
                ) : (
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                <h2 className="text-lg font-semibold text-foreground">Messages</h2>
                {!inboxLoading && inboxMessages.filter(m => !m.read).length > 0 && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    {inboxMessages.filter(m => !m.read).length} unread
                  </span>
                )}
              </div>
              <Link
                href="/mailbox"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                View all →
              </Link>
            </div>

            {inboxLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted-foreground/30" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-4 w-24 rounded bg-muted-foreground/30" />
                          <div className="ml-auto h-3 w-12 rounded bg-muted-foreground/20" />
                        </div>
                        <div className="h-4 w-3/4 rounded bg-muted-foreground/20 mb-2" />
                        <div className="h-3 w-full rounded bg-muted-foreground/15" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="space-y-3">
              {/* Latest 3 messages from unique senders */}
              {(() => {
                const seenSenders = new Set<string>();
                return inboxMessages.filter((m) => {
                  const sender = m.from.split('/').pop() || m.from;
                  if (seenSenders.has(sender)) return false;
                  seenSenders.add(sender);
                  return true;
                }).slice(0, 3);
              })().map((message) => {
                const isSelected = selectedMessage === message.id;
                return (
                  <div
                    key={message.id}
                    className={`rounded-lg border overflow-hidden transition-all ${
                      !message.read
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedMessage(isSelected ? null : message.id);
                        setReplyText('');
                      }}
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Sender avatar/icon */}
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          message.from.toLowerCase().includes('mayor')
                            ? 'bg-primary/30 text-primary'
                            : message.from.toLowerCase().includes('crew') || message.from.includes('/')
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {message.from.split('/').pop()?.charAt(0).toUpperCase() || '?'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {message.from.split('/').pop() || message.from}
                            </span>
                            {!message.read && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {formatRelativeTime(message.timestamp)}
                            </span>
                          </div>
                          <div className="font-medium text-sm text-foreground truncate">
                            {message.subject}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {message.body}
                          </div>
                        </div>

                        <svg className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded view with full message and reply */}
                    {isSelected && (
                      <div className="px-4 pb-4 border-t border-border">
                        {/* Full message body */}
                        <div className="mt-3 p-3 rounded-md bg-muted text-sm text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {message.body}
                        </div>

                        {/* Reply input */}
                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReplyToMessage(message);
                              }
                              if (e.key === 'Escape') {
                                setSelectedMessage(null);
                                setReplyText('');
                              }
                            }}
                            placeholder={`Reply to ${message.from.split('/').pop() || message.from}...`}
                            className="flex-1 px-3 py-2 text-sm rounded border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                            autoFocus
                          />
                          <button
                            onClick={() => handleReplyToMessage(message)}
                            disabled={sendingReply || !replyText.trim()}
                            className="px-4 py-2 text-sm rounded bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-colors"
                          >
                            {sendingReply ? '...' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* MIDDLE SECTION - Convoys & Beads */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            {isKawaii ? (
              <span className="text-xl">⚡</span>
            ) : (
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <h2 className="text-xl font-bold text-foreground">Work</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Convoys */}
            <FeatureGate feature="convoys">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isKawaii ? (
                      <span className="text-xl">🚚</span>
                    ) : (
                      <svg className="h-5 w-5 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                    <h3 className="text-lg font-semibold text-foreground">
                      Convoys
                    </h3>
                    {!convoysLoading && (
                      <span className="rounded-full bg-chart-2/20 px-2 py-0.5 text-xs font-semibold text-chart-2">
                        {activeConvoys.length}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/work"
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    View all →
                  </Link>
                </div>

                {convoysLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse rounded-md border border-border bg-muted p-3">
                        <div className="h-5 w-3/4 rounded bg-muted-foreground/30" />
                        <div className="mt-2 h-3 w-1/2 rounded bg-muted-foreground/20" />
                      </div>
                    ))}
                  </div>
                ) : activeConvoys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active convoys</p>
                ) : (
                  <div className="space-y-3">
                    {activeConvoys.map((convoy) => (
                      <Link
                        key={convoy.id}
                        href={`/work?convoy=${convoy.id}`}
                        className="flex items-center justify-between rounded-md border border-border bg-muted p-3 transition-all hover:border-chart-2/50 hover:bg-chart-2/10"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${convoy.status === 'stalled' ? 'bg-chart-4' : 'bg-chart-2'}`} />
                            <span className="font-medium text-foreground">{convoy.title}</span>
                            {convoy.status === 'stalled' && (
                              <span className="rounded-full bg-chart-4/20 px-2 py-0.5 text-xs font-medium text-chart-4">
                                Stalled
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{convoy.progress.completed} / {convoy.progress.total} completed</span>
                            {convoy.assignee && <span>Assigned: {convoy.assignee}</span>}
                          </div>
                        </div>
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </FeatureGate>

            {/* Beads - In Progress */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isKawaii ? (
                    <span className="text-4xl">📿</span>
                  ) : (
                    <svg className="h-5 w-5 text-chart-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" strokeWidth={2} />
                      <circle cx="12" cy="12" r="8" strokeWidth={2} strokeDasharray="4 2" />
                    </svg>
                  )}
                  <h3 className="text-lg font-semibold text-foreground">
                    Beads
                  </h3>
                  {!beadsLoading && (
                    <span className="rounded-full bg-chart-1/20 px-2 py-0.5 text-xs font-semibold text-chart-1">
                      {activeIssues.length}
                    </span>
                  )}
                </div>
                <Link
                  href="/work"
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  View all →
                </Link>
              </div>

              {beadsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-md border border-border bg-muted p-2">
                      <div className="h-4 w-2/3 rounded bg-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              ) : activeIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No beads in progress</p>
              ) : (
                <div className="space-y-2">
                  {activeIssues.slice(0, 5).map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/work?issue=${issue.id}`}
                      className="flex items-center gap-3 rounded-md border border-border bg-muted p-2 transition-all hover:border-chart-1/50 hover:bg-chart-1/10"
                    >
                      <div className={`h-2 w-2 rounded-full ${issue.status === 'in_progress' ? 'bg-chart-1' : 'bg-primary'}`} />
                      <span className="flex-1 text-sm text-foreground">{issue.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${issue.status === 'in_progress' ? 'bg-chart-1/20 text-chart-1' : 'bg-primary/20 text-primary'}`}>
                        {issue.status}
                      </span>
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                  {activeIssues.length > 5 && (
                    <p className="pt-2 text-xs text-muted-foreground">
                      + {activeIssues.length - 5} more beads
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Active Workers (Crew + Polecats) */}
            <FeatureGate feature="crew">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isKawaii ? (
                      <span className="text-xl">👷</span>
                    ) : (
                      <svg className="h-5 w-5 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    <h3 className="text-lg font-semibold text-foreground">
                      Crew
                    </h3>
                    {!polecatsLoading && !gtLoading && (
                      <span className="rounded-full bg-chart-3/20 px-2 py-0.5 text-xs font-semibold text-chart-3">
                        {activePolecats.length + runningCrew.length}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/workers"
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    View all →
                  </Link>
                </div>

                {polecatsLoading && gtLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse rounded-md border border-border bg-muted p-2">
                        <div className="h-4 w-1/2 rounded bg-muted-foreground/30" />
                      </div>
                    ))}
                  </div>
                ) : activePolecats.length === 0 && runningCrew.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No workers currently active</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Running crew members - card with inline messaging */}
                    {runningCrew.map((crew) => {
                      const crewKey = `${crew.rig}/${crew.name}`;
                      const isSending = sendingCrewMessage === crewKey;
                      const message = crewMessages[crewKey] || '';
                      return (
                        <div key={`crew-${crew.rig}-${crew.name}`} className="rounded-lg border border-border bg-muted p-3">
                          {/* Header row */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${crew.has_work ? 'bg-chart-2' : 'bg-chart-1'}`} />
                            <span className="font-mono text-sm font-semibold text-foreground">{crew.name}</span>
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">crew</span>
                            {crew.unread_mail > 0 && (
                              <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                                {crew.unread_mail} mail
                              </span>
                            )}
                          </div>
                          {/* Info row */}
                          <div className="flex items-center gap-2 mb-3 text-xs">
                            <span className="text-muted-foreground">on {crew.rig}</span>
                            {crew.branch && crew.branch !== 'main' && (
                              <span className="flex items-center gap-1 rounded bg-chart-1/20 px-1.5 py-0.5 font-medium text-chart-1">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {crew.branch}
                                {crew.gitStatus === 'dirty' && <span className="text-chart-4">*</span>}
                              </span>
                            )}
                            {crew.branch === 'main' && (
                              <span className="text-muted-foreground italic">on main</span>
                            )}
                          </div>
                          {/* Always-visible message input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={message}
                              onChange={(e) => setCrewMessages((prev) => ({ ...prev, [crewKey]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleMailCrew(crew);
                                }
                              }}
                              placeholder={`Message ${crew.name}...`}
                              className="flex-1 px-2 py-1.5 text-sm rounded bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                            />
                            <button
                              onClick={() => handleMailCrew(crew)}
                              disabled={isSending || !message.trim()}
                              className="px-3 py-1.5 text-xs rounded bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-colors"
                            >
                              {isSending ? '...' : 'Mail'}
                            </button>
                            <button
                              onClick={() => handleNudgeCrew(crew)}
                              disabled={isSending}
                              className="px-2 py-1.5 text-xs rounded border border-border bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50 transition-colors"
                              title="Tap on shoulder"
                            >
                              👋
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {/* Active polecats */}
                    {activePolecats.map((polecat) => (
                      <div key={polecat.id} className="rounded-lg border border-border bg-muted p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2.5 w-2.5 rounded-full bg-chart-2" />
                          <span className="font-mono text-sm font-semibold text-foreground">{polecat.name}</span>
                          {polecat.unread_mail > 0 && (
                            <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                              {polecat.unread_mail} mail
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">on {polecat.rig}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FeatureGate>
          </div>
        </div>

        {/* AGENT ACTIVITY SECTION */}
        {(activitiesLoading || agentActivities.length > 0) && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              {isKawaii ? (
                <span className="text-xl">🎬</span>
              ) : (
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
              <h2 className="text-xl font-bold text-foreground">Agent Activity</h2>
              {!activitiesLoading && (
                <span className="rounded-full bg-chart-2/20 px-2 py-0.5 text-xs font-semibold text-chart-2">
                  {agentActivities.length} active
                </span>
              )}
            </div>

            {activitiesLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                      <div className="h-4 w-20 rounded bg-muted-foreground/30" />
                      <div className="h-4 w-12 rounded bg-muted-foreground/20" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded bg-muted-foreground/20" />
                      <div className="h-3 w-3/4 rounded bg-muted-foreground/15" />
                      <div className="h-3 w-2/3 rounded bg-muted-foreground/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {agentActivities.map((agent) => (
                  <div
                    key={agent.session}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        agent.activity === 'Idle' ? 'bg-muted-foreground' :
                        agent.tool ? 'bg-chart-1' : 'bg-chart-2 animate-pulse'
                      }`} />
                      <span className="font-semibold text-foreground">{agent.name}</span>
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {agent.role}
                      </span>
                      {agent.duration && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {agent.duration}
                        </span>
                      )}
                    </div>
                    {/* Show last 3 activities */}
                    <div className="space-y-1">
                      {agent.activities.slice(0, 3).map((act, idx) => (
                        <div
                          key={idx}
                          className={`text-sm ${idx === 0 ? 'text-foreground' : 'text-muted-foreground text-xs'}`}
                        >
                          {act}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOTTOM SECTION - Engine Health + Output */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            {isKawaii ? (
              <span className="text-xl">🔧</span>
            ) : (
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <h2 className="text-xl font-bold text-foreground">System Status</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Engine Health */}
            <FeatureGate feature="deacon">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isKawaii ? (
                      <span className="text-4xl">{systemHealthy ? '✅' : '⚠️'}</span>
                    ) : (
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-md ${systemHealthy ? 'bg-chart-2' : 'bg-destructive'}`}>
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {systemHealthy ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          )}
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        Engine {systemHealthy ? 'Running' : 'Issues'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        System health indicators
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/system"
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    Engine Room →
                  </Link>
                </div>

                {gtLoading || beadsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse rounded-lg border border-border bg-muted p-3">
                        <div className="h-3 w-16 rounded bg-muted-foreground/30" />
                        <div className="mt-2 h-6 w-20 rounded bg-muted-foreground/20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <div className="text-xs font-medium text-muted-foreground">Deacon</div>
                    <div className={`mt-1 text-lg font-bold ${deaconAlive ? 'text-chart-2' : 'text-destructive'}`}>
                      {deaconAlive ? 'Running' : 'Stopped'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <div className="text-xs font-medium text-muted-foreground">Witnesses</div>
                    <div className="mt-1 text-lg font-bold text-foreground">
                      {activeWitnesses} / {witnesses.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <div className="text-xs font-medium text-muted-foreground">Refineries</div>
                    <div className="mt-1 text-lg font-bold text-foreground">
                      {activeRefineries} / {refineries.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <div className="text-xs font-medium text-muted-foreground">Workers</div>
                    <div className="mt-1 text-lg font-bold text-foreground">
                      {activePolecats.length + runningCrew.length} active
                    </div>
                  </div>
                </div>
                )}
              </div>
            </FeatureGate>

            {/* Recent Output (Refineries) */}
            <FeatureGate feature="refineries">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isKawaii ? (
                      <span className="text-xl">✨</span>
                    ) : (
                      <svg className="h-5 w-5 text-chart-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    )}
                    <h3 className="text-lg font-semibold text-foreground">
                      Refinery Output
                    </h3>
                  </div>
                  <Link
                    href="/system"
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    View details →
                  </Link>
                </div>

                {beadsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-md border border-border bg-muted p-2">
                        <div className="h-4 w-1/3 rounded bg-muted-foreground/30" />
                      </div>
                    ))}
                  </div>
                ) : refineries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No refineries configured</p>
                ) : (
                  <div className="space-y-3">
                    {refineries.map((refinery) => (
                      <div key={refinery.rig} className="rounded-md border border-border bg-muted p-3">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full ${refinery.status === 'processing' ? 'bg-chart-2 animate-pulse' : refinery.status === 'active' ? 'bg-chart-1' : 'bg-muted-foreground'}`} />
                            <span className="font-mono text-sm font-medium text-foreground">{refinery.rig}</span>
                          </div>
                          {refinery.queueDepth > 0 && (
                            <span className="rounded-full bg-chart-4/20 px-2 py-0.5 text-xs font-medium text-chart-4">
                              {refinery.queueDepth} queued
                            </span>
                          )}
                        </div>

                        {/* Current PR being processed */}
                        {refinery.currentPR && (
                          <div className="mb-2 rounded bg-chart-2/10 px-2 py-1.5 text-xs">
                            <span className="text-chart-2 font-medium">Processing:</span>
                            <span className="ml-1.5 text-foreground">
                              PR #{refinery.currentPR.number}
                              {refinery.currentPR.title && ` - ${refinery.currentPR.title}`}
                            </span>
                          </div>
                        )}

                        {/* Queue items */}
                        {refinery.queueItems && refinery.queueItems.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Queue</div>
                            {refinery.queueItems.slice(0, 5).map((item, idx) => (
                              <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="text-muted-foreground/50">{idx + 1}.</span>
                                {item.url ? (
                                  <Link href={item.url} className="truncate hover:text-primary hover:underline">
                                    {item.title || item.branch || 'Unknown'}
                                  </Link>
                                ) : (
                                  <span className="truncate">{item.title || item.branch || 'Unknown'}</span>
                                )}
                              </div>
                            ))}
                            {refinery.queueItems.length > 5 && (
                              <div className="text-[10px] text-muted-foreground">
                                + {refinery.queueItems.length - 5} more
                              </div>
                            )}
                          </div>
                        )}

                        {/* Empty state */}
                        {!refinery.currentPR && refinery.queueDepth === 0 && (
                          <div className="text-xs text-muted-foreground">Idle - no work queued</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FeatureGate>
          </div>
        </div>
      </main>

      {/* Mayor Mail Modal */}
      {isMailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsMailModalOpen(false)}>
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Send Instructions to Mayor</h3>
              <button
                onClick={() => setIsMailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Subject <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Instructions</label>
                <textarea
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  placeholder="Describe the work, requirements, or questions..."
                  rows={10}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsMailModalOpen(false)}
                  disabled={isSendingMail}
                  className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMail}
                  disabled={isSendingMail || !mailBody}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSendingMail ? 'Sending...' : 'Send to Mayor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
