'use client';

import { Suspense, useCallback, useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useIssues, useConvoys } from '@/lib/use-beads';
import { KanbanBoard, IssueDetailModal } from '@/components/kanban';
import { ConvoyList, ConvoyContextMenu, ConvoyDetailModal } from '@/components/convoy';
import { NavBar } from '@/components/layout';
import { AlertModal } from '@/components/settings';
import { FeatureGate } from '@/lib/project-mode';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Issue, IssueStatus, Convoy } from '@/types/beads';

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

function WorkPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isKawaii = theme === 'smorgasbord';
  const { issues, isLoading: issuesLoading, error: issuesError, refresh: refreshIssues, updateIssue } = useIssues();
  const { convoys, isLoading: convoysLoading, error: convoysError } = useConvoys();
  const [selectedConvoy, setSelectedConvoy] = useState<Convoy | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stalled' | 'completed'>('all');
  const [showInternal, setShowInternal] = useState(false); // Hide internal beads by default
  const kanbanRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenuConvoy, setContextMenuConvoy] = useState<Convoy | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Escalation modal state
  const [escalateConvoy, setEscalateConvoy] = useState<Convoy | null>(null);
  const [escalateMessage, setEscalateMessage] = useState('');

  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const isLoading = issuesLoading || convoysLoading;
  const error = issuesError || convoysError;

  // Handle URL parameters to auto-open convoy or issue
  useEffect(() => {
    if (isLoading) return;

    const convoyId = searchParams.get('convoy');
    const issueId = searchParams.get('issue');

    if (convoyId && !selectedConvoy) {
      const convoy = convoys.find(c => c.id === convoyId);
      if (convoy) {
        setSelectedConvoy(convoy);
      }
    }

    if (issueId && !selectedIssue) {
      const issue = issues.find(i => i.id === issueId);
      if (issue) {
        setSelectedIssue(issue);
        setHighlightedIssueId(issueId);
      }
    }
  }, [searchParams, convoys, issues, isLoading, selectedConvoy, selectedIssue]);

  // Filter convoys based on search and status
  const filteredConvoys = convoys.filter((convoy) => {
    const matchesSearch = convoy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         convoy.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || convoy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Convoy stats (based on filtered results)
  const activeCount = filteredConvoys.filter((c) => c.status === 'active').length;
  const stalledCount = filteredConvoys.filter((c) => c.status === 'stalled').length;
  const completedCount = filteredConvoys.filter((c) => c.status === 'completed').length;

  const totalIssues = filteredConvoys.reduce((sum, c) => sum + c.progress.total, 0);
  const completedIssues = filteredConvoys.reduce((sum, c) => sum + c.progress.completed, 0);
  const overallProgress = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  const handleStatusChange = useCallback(
    async (issue: Issue, newStatus: IssueStatus) => {
      const originalStatus = issue.status;

      // Optimistic update - immediately move the card
      updateIssue(issue.id, { status: newStatus });

      try {
        const response = await fetch(`/api/beads/issues/${issue.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, rig: issue._rig }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to update status:', errorData);
          // Revert on error
          updateIssue(issue.id, { status: originalStatus });
          setAlertModal({
            title: 'Status Update Failed',
            message: errorData.details || errorData.error || 'Failed to update bead status',
            variant: 'error',
          });
          return;
        }

        // Refresh to get any server-side changes (like timestamps)
        refreshIssues();
      } catch (error) {
        console.error('Error updating bead status:', error);
        // Revert on error
        updateIssue(issue.id, { status: originalStatus });
        setAlertModal({
          title: 'Status Update Failed',
          message: error instanceof Error ? error.message : 'Network error updating status',
          variant: 'error',
        });
      }
    },
    [updateIssue, refreshIssues]
  );

  const handleSelectConvoy = (convoy: Convoy) => {
    setSelectedConvoy(convoy);
  };

  const handleNudge = async (convoy: Convoy) => {
    try {
      const response = await fetch(`/api/convoys/${convoy.id}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to nudge workers:', errorData);
        setAlertModal({
          title: 'Nudge Failed',
          message: errorData.error || 'Unknown error',
          variant: 'error',
        });
        return;
      }

      const result = await response.json();
      console.log('Nudge result:', result);
      setAlertModal({
        title: 'Workers Nudged',
        message: result.message || `Nudged ${result.nudged_count || 0} worker(s) for convoy ${convoy.title}`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Error nudging workers:', error);
      setAlertModal({
        title: 'Nudge Failed',
        message: 'Failed to nudge workers. Check console for details.',
        variant: 'error',
      });
    }
  };

  const handleConvoyContextMenu = useCallback((e: React.MouseEvent, convoy: Convoy) => {
    e.preventDefault();
    setContextMenuConvoy(convoy);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuConvoy(null);
    setContextMenuPosition(null);
  }, []);

  const handleEscalateFromMenu = useCallback((convoy: Convoy) => {
    setEscalateConvoy(convoy);
  }, []);

  const handleSendEscalation = useCallback(async () => {
    if (!escalateConvoy) return;

    try {
      const response = await fetch(`/api/convoys/${escalateConvoy.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: escalateMessage.trim() || undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to escalate convoy:', errorData);
        setAlertModal({
          title: 'Escalation Failed',
          message: errorData.error || 'Unknown error',
          variant: 'error',
        });
        return;
      }

      const result = await response.json();
      console.log('Escalate result:', result);
      setAlertModal({
        title: 'Convoy Escalated',
        message: result.message || `Escalated convoy "${escalateConvoy.title}" to mayor`,
        variant: 'success',
      });

      setEscalateConvoy(null);
      setEscalateMessage('');
    } catch (error) {
      console.error('Error escalating convoy:', error);
      setAlertModal({
        title: 'Escalation Failed',
        message: 'Failed to escalate convoy. Check console for details.',
        variant: 'error',
      });
    }
  }, [escalateConvoy, escalateMessage]);

  const handleIssueClickFromConvoy = useCallback((issue: Issue) => {
    // Keep convoy modal open, just open issue modal on top
    setSelectedIssue(issue);
  }, []);

  const handleViewInKanban = useCallback(() => {
    setSelectedIssue(null); // Close issue modal
    setSelectedConvoy(null); // Close convoy modal if open
    router.push('/work'); // Clear URL parameters

    // Scroll to the kanban board section
    if (kanbanRef.current) {
      kanbanRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Highlight the issue briefly (keep the highlightedIssueId from selectedIssue)
    if (selectedIssue) {
      setHighlightedIssueId(selectedIssue.id);

      // Find and scroll to the specific issue card
      setTimeout(() => {
        const issueCard = document.querySelector(`[data-issue-id="${selectedIssue.id}"]`);
        if (issueCard) {
          issueCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Clear highlight after 3 seconds
        setTimeout(() => {
          setHighlightedIssueId(null);
        }, 3000);
      }, 500); // Wait for kanban section to scroll first
    }
  }, [selectedIssue, router]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Convoys Section */}
        <FeatureGate feature="convoys">
        {(convoysLoading || convoys.length > 0) && (
          <div className="mb-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Convoy Tracking
                </h2>
                {!convoysLoading && (searchQuery || statusFilter !== 'all') ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Showing {filteredConvoys.length} of {convoys.length}
                  </p>
                ) : null}
              </div>

              {/* Summary Stats */}
              {convoysLoading ? (
                <div className="flex items-center gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse text-center">
                      <div className="mx-auto h-8 w-12 rounded bg-muted" />
                      <div className="mt-1 h-3 w-16 rounded bg-muted/50" />
                    </div>
                  ))}
                </div>
              ) : !error && (
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className={cn("text-2xl font-bold text-foreground", isKawaii && "kawaii-stat")}>
                      {filteredConvoys.length}
                    </p>
                    <p className="text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-2xl font-bold text-green-400", isKawaii && "kawaii-stat")}>{activeCount}</p>
                    <p className="text-muted-foreground">Active</p>
                  </div>
                  {stalledCount > 0 && (
                    <div className="text-center">
                      <p className={cn("text-2xl font-bold text-amber-400", isKawaii && "kawaii-stat")}>
                        {stalledCount}
                      </p>
                      <p className="text-muted-foreground">Stalled</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className={cn("text-2xl font-bold text-purple-400", isKawaii && "kawaii-stat")}>
                      {completedCount}
                    </p>
                    <p className="text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-2xl font-bold text-blue-400", isKawaii && "kawaii-stat")}>
                      {overallProgress}%
                    </p>
                    <p className="text-muted-foreground">Progress</p>
                  </div>
                </div>
              )}
            </div>

            {/* Search and Filter Controls */}
            <div className="mb-4 flex items-center gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search convoys by title or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    statusFilter === 'all' && 'bg-blue-500 hover:bg-blue-600'
                  )}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className={cn(
                    statusFilter === 'active' && 'bg-green-500 hover:bg-green-600'
                  )}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'stalled' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter('stalled')}
                  className={cn(
                    statusFilter === 'stalled' && 'bg-amber-500 hover:bg-amber-600'
                  )}
                >
                  Stalled
                </Button>
                <Button
                  variant={statusFilter === 'completed' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter('completed')}
                  className={cn(
                    statusFilter === 'completed' && 'bg-purple-500 hover:bg-purple-600'
                  )}
                >
                  Completed
                </Button>
              </div>
            </div>

            {/* Convoy List */}
            {convoysLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-5 w-3/4 rounded bg-muted" />
                        <div className="mt-2 h-3 w-1/2 rounded bg-muted/50" />
                      </div>
                      <div className="h-6 w-20 rounded bg-muted/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ConvoyList
                convoys={filteredConvoys}
                issues={issues}
                onSelectConvoy={handleSelectConvoy}
                onConvoyContextMenu={handleConvoyContextMenu}
              />
            )}
          </div>
        )}
        </FeatureGate>

        {/* Convoy Context Menu */}
        <FeatureGate feature="convoys">
          <ConvoyContextMenu
            convoy={contextMenuConvoy}
            position={contextMenuPosition}
            onClose={handleCloseContextMenu}
            onViewDetails={(convoy) => setSelectedConvoy(convoy)}
            onNudge={handleNudge}
            onEscalate={handleEscalateFromMenu}
          />

          {/* Convoy Detail Modal */}
          <ConvoyDetailModal
            convoy={selectedConvoy}
            issues={issues}
            onClose={() => {
              setSelectedConvoy(null);
              router.push('/work');
            }}
            onNudge={handleNudge}
            onEscalate={handleEscalateFromMenu}
            onIssueClick={handleIssueClickFromConvoy}
          />

          {/* Escalation Modal */}
          {escalateConvoy && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => {
                setEscalateConvoy(null);
                setEscalateMessage('');
              }}
            >
              <div
                className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Escalate to Mayor
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Convoy: {escalateConvoy.title}
                </p>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Optional Message
                </label>
                <Textarea
                  value={escalateMessage}
                  onChange={(e) => setEscalateMessage(e.target.value)}
                  placeholder="Add context about why this needs attention..."
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleSendEscalation}
                    className="flex-1 bg-amber-500 hover:bg-amber-600"
                  >
                    Send Escalation
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEscalateConvoy(null);
                      setEscalateMessage('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </FeatureGate>

        {/* Work Status Section */}
        <div ref={kanbanRef} className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isKawaii && <span className="text-4xl">📿</span>}
            <h2 className="text-2xl font-bold text-foreground">
              Beads
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {/* Show Internal Toggle */}
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Show internal
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshIssues()}
              disabled={isLoading}
            >
              <svg
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Error loading issues: {error.message}
          </div>
        )}

        {isLoading && issues.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-8 w-8 animate-spin text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading issues...
              </p>
            </div>
          </div>
        ) : (
          <KanbanBoard
            issues={showInternal ? issues : issues.filter(isProjectBead)}
            onStatusChange={handleStatusChange}
            highlightedIssueId={highlightedIssueId}
            selectedIssue={selectedIssue}
            onSelectIssue={setSelectedIssue}
          />
        )}

        {/* Issue Detail Modal - with View in Kanban button */}
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => {
            setSelectedIssue(null);
            router.push('/work');
          }}
          onViewInKanban={handleViewInKanban}
          onUpdate={(updatedIssue) => {
            // Update local state with changes
            updateIssue(updatedIssue.id, updatedIssue);
            // Update the selected issue reference
            setSelectedIssue(updatedIssue);
            // Refresh to sync with server
            refreshIssues();
          }}
          onOpenIssue={(issueId) => {
            const issue = issues.find(i => i.id === issueId);
            if (issue) {
              setSelectedIssue(issue);
            }
          }}
        />
      </main>

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}

export default function WorkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-8 w-8 animate-spin text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading...
              </p>
            </div>
          </div>
        </main>
      </div>
    }>
      <WorkPageContent />
    </Suspense>
  );
}
