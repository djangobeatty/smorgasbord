'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePolecats, useRigs } from '@/lib/use-beads';
import { useCrewStatus } from '@/lib/use-crew';
import { NavBar } from '@/components/layout';
import { ConfirmModal } from '@/components/settings';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function WorkersPage() {
  const { polecats, isLoading: polecatsLoading, refresh: refreshPolecats } = usePolecats();
  const { crewState, isLoading: crewLoading, refresh: refreshCrew } = useCrewStatus();
  const { rigs } = useRigs();

  const crew = crewState?.members ?? [];

  const [selectedWorker, setSelectedWorker] = useState<{ type: 'crew' | 'polecat'; id: string } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessionView, setSessionView] = useState<{ name: string; output: string } | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
  } | null>(null);

  // Add crew form state
  const [showAddCrewForm, setShowAddCrewForm] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewRig, setNewCrewRig] = useState('');
  const [newCrewBranch, setNewCrewBranch] = useState(false);
  const [isAddingCrew, setIsAddingCrew] = useState(false);

  const isLoading = polecatsLoading || crewLoading;

  // Auto-select rig if there's only one
  useEffect(() => {
    if (rigs.length === 1 && !newCrewRig) {
      setNewCrewRig(rigs[0].name);
    }
  }, [rigs, newCrewRig]);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (statusMessage?.type === 'success') {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Combined stats
  const totalWorkers = polecats.length + crew.length;
  const activePolecats = polecats.filter(p => p.status === 'active').length;
  const activeCrew = crew.filter(c => c.status === 'running').length;
  const totalActive = activePolecats + activeCrew;
  const totalWithMail = polecats.filter(p => p.unread_mail > 0).length + crew.filter(c => c.mailCount > 0).length;

  const handleNudge = useCallback(async (name: string, rig: string, type: 'crew' | 'polecat') => {
    if (!messageText.trim()) {
      setStatusMessage({ type: 'error', text: 'Message cannot be empty' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/${type === 'crew' ? 'crew' : 'polecats'}/${encodeURIComponent(name)}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to send message to ${name}`);
      }

      setStatusMessage({ type: 'success', text: `Message sent to ${name}` });
      setMessageText('');
      setSelectedWorker(null);

      // Refresh data
      if (type === 'crew') {
        refreshCrew();
      } else {
        refreshPolecats();
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send message',
      });
    } finally {
      setIsSending(false);
    }
  }, [messageText, refreshCrew, refreshPolecats]);

  const handleViewSession = useCallback(async (polecatName: string) => {
    setIsLoadingSession(true);
    setSessionView(null);

    try {
      const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/session`);

      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }

      const data = await response.json();
      setSessionView({ name: data.name, output: data.output });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load session',
      });
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  const handleNuke = useCallback((polecatName: string, rig: string) => {
    setConfirmModal({
      title: 'Nuke Polecat',
      message: `Are you sure you want to nuke ${polecatName}? This will terminate the polecat and delete its worktree.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/nuke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rig }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Check if it's a safety check failure that can be forced
            if (errorData.canForce) {
              setConfirmModal({
                title: 'Force Nuke',
                message: `${errorData.error}\n\nDo you want to force nuke? This will LOSE ANY UNCOMMITTED WORK.`,
                variant: 'danger',
                onConfirm: async () => {
                  setConfirmModal(null);
                  try {
                    const forceResponse = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/nuke`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ rig, force: true }),
                    });

                    if (!forceResponse.ok) {
                      const forceErrorData = await forceResponse.json();
                      throw new Error(forceErrorData.error || `Failed to force nuke ${polecatName}`);
                    }

                    setStatusMessage({ type: 'success', text: `${polecatName} force nuked successfully` });
                    refreshPolecats();
                  } catch (err) {
                    setStatusMessage({
                      type: 'error',
                      text: err instanceof Error ? err.message : 'Failed to force nuke polecat',
                    });
                  }
                },
              });
              return;
            }

            throw new Error(errorData.error || `Failed to nuke ${polecatName}`);
          }

          setStatusMessage({ type: 'success', text: `${polecatName} nuked successfully` });
          refreshPolecats();
        } catch (error) {
          setStatusMessage({
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to nuke polecat',
          });
        }
      },
    });
  }, [refreshPolecats]);

  const handlePolecatStart = useCallback(async (polecatName: string, rig: string) => {
    try {
      const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to start ${polecatName}`);
      }

      setStatusMessage({ type: 'success', text: `${polecatName} started successfully` });
      refreshPolecats();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to start polecat',
      });
    }
  }, [refreshPolecats]);

  const handlePolecatStop = useCallback(async (polecatName: string, rig: string) => {
    try {
      const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to stop ${polecatName}`);
      }

      setStatusMessage({ type: 'success', text: `${polecatName} stopped successfully` });
      refreshPolecats();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to stop polecat',
      });
    }
  }, [refreshPolecats]);

  const handlePolecatRestart = useCallback(async (polecatName: string, rig: string) => {
    try {
      const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to restart ${polecatName}`);
      }

      setStatusMessage({ type: 'success', text: `${polecatName} restarted successfully` });
      refreshPolecats();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to restart polecat',
      });
    }
  }, [refreshPolecats]);

  const handleCrewStart = useCallback(async (crewName: string, rig: string) => {
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to start ${crewName}`);
      }

      setStatusMessage({ type: 'success', text: `${crewName} started successfully` });
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to start crew member',
      });
    }
  }, [refreshCrew]);

  const handleCrewStop = useCallback(async (crewName: string, rig: string) => {
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to stop ${crewName}`);
      }

      setStatusMessage({ type: 'success', text: `${crewName} stopped successfully` });
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to stop crew member',
      });
    }
  }, [refreshCrew]);

  const handleCrewRestart = useCallback(async (crewName: string, rig: string) => {
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to restart ${crewName}`);
      }

      setStatusMessage({ type: 'success', text: `${crewName} restarted successfully` });
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to restart crew member',
      });
    }
  }, [refreshCrew]);

  const handleCrewRefresh = useCallback(async (crewName: string, rig: string) => {
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to refresh ${crewName}`);
      }

      setStatusMessage({ type: 'success', text: `${crewName} refreshed successfully` });
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to refresh crew member',
      });
    }
  }, [refreshCrew]);

  const handleCrewRemove = useCallback((crewName: string, rig: string) => {
    setConfirmModal({
      title: 'Remove Crew Member',
      message: `Are you sure you want to remove ${crewName}? This will permanently delete the workspace.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rig }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Check if it's a safety check failure that can be forced
            if (errorData.canForce) {
              setConfirmModal({
                title: 'Force Remove',
                message: `${errorData.error}\n\nDo you want to force remove? This will LOSE ANY UNCOMMITTED WORK.`,
                variant: 'danger',
                onConfirm: async () => {
                  setConfirmModal(null);
                  try {
                    const forceResponse = await fetch(`/api/crew/${encodeURIComponent(crewName)}/remove`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ force: true, rig }),
                    });

                    if (!forceResponse.ok) {
                      const forceErrorData = await forceResponse.json();
                      throw new Error(forceErrorData.error || `Failed to force remove ${crewName}`);
                    }

                    setStatusMessage({ type: 'success', text: `${crewName} force removed successfully` });
                    refreshCrew();
                  } catch (err) {
                    setStatusMessage({
                      type: 'error',
                      text: err instanceof Error ? err.message : 'Failed to force remove crew member',
                    });
                  }
                },
              });
              return;
            }

            throw new Error(errorData.error || `Failed to remove ${crewName}`);
          }

          setStatusMessage({ type: 'success', text: `${crewName} removed successfully` });
          refreshCrew();
        } catch (error) {
          setStatusMessage({
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to remove crew member',
          });
        }
      },
    });
  }, [refreshCrew]);

  const handleAddCrew = useCallback(async () => {
    if (!newCrewName.trim()) {
      setStatusMessage({ type: 'error', text: 'Crew name is required' });
      return;
    }
    if (!newCrewRig) {
      setStatusMessage({ type: 'error', text: 'Rig is required' });
      return;
    }

    setIsAddingCrew(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/crew/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCrewName.trim(),
          rig: newCrewRig,
          branch: newCrewBranch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add crew member');
      }

      setStatusMessage({ type: 'success', text: `Crew member '${newCrewName}' added successfully` });
      setNewCrewName('');
      setNewCrewRig('');
      setNewCrewBranch(false);
      setShowAddCrewForm(false);
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add crew member',
      });
    } finally {
      setIsAddingCrew(false);
    }
  }, [newCrewName, newCrewRig, newCrewBranch, refreshCrew]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Workers
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              All crew members and polecats in your Gas Town system
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddCrewForm(!showAddCrewForm)}
              variant="outline"
              size="sm"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
            >
              {showAddCrewForm ? 'Cancel' : 'Add Crew'}
            </Button>
            <Button
              onClick={() => {
                refreshCrew();
                refreshPolecats();
              }}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <svg
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
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

        {/* Add Crew Form */}
        {showAddCrewForm && (
          <div className="mb-6 rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 font-semibold text-foreground">Add New Crew Member</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="crew-name" className="mb-1 block text-sm font-medium text-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="crew-name"
                  type="text"
                  value={newCrewName}
                  onChange={(e) => setNewCrewName(e.target.value)}
                  placeholder="e.g., dave, emma, fred"
                  disabled={isAddingCrew}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Rig <span className="text-destructive">*</span>
                </label>
                <Select
                  value={newCrewRig}
                  onChange={setNewCrewRig}
                  disabled={isAddingCrew || rigs.length === 0}
                  placeholder="Select a rig"
                  options={rigs.map((rig) => ({ value: rig.name, label: rig.name }))}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={newCrewBranch}
                    onChange={(e) => setNewCrewBranch(e.target.checked)}
                    disabled={isAddingCrew}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  Create feature branch
                </label>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleAddCrew}
                disabled={isAddingCrew || !newCrewName.trim() || !newCrewRig}
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {isAddingCrew ? 'Adding... (this may take a minute)' : 'Add Crew Member'}
              </Button>
              <Button
                onClick={() => {
                  setShowAddCrewForm(false);
                  setNewCrewName('');
                  setNewCrewRig('');
                  setNewCrewBranch(false);
                }}
                disabled={isAddingCrew}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-bold text-foreground">
              {totalWorkers}
            </div>
            <div className="text-sm text-muted-foreground">Total Workers</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalActive}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalWithMail}
            </div>
            <div className="text-sm text-muted-foreground">With Mail</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {crew.length} / {polecats.length}
            </div>
            <div className="text-sm text-muted-foreground">Crew / Polecats</div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mb-4 rounded-md border p-3 ${
              statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400'
                : 'border-destructive/50 bg-destructive/10 text-destructive'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {isLoading && totalWorkers === 0 ? (
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
                Loading workers...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Crew Section */}
            {crew.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  Crew Members ({crew.length})
                </h2>
                <div className="space-y-3">
                  {crew.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* Status Dot */}
                          <div className="mt-1">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                member.status === 'running'
                                  ? 'bg-emerald-500'
                                  : member.status === 'error'
                                  ? 'bg-destructive'
                                  : 'bg-muted-foreground'
                              }`}
                            />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-foreground">
                                {member.name}
                              </span>
                              {member.mailCount > 0 && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {member.mailCount} mail
                                </span>
                              )}
                              {member.gitStatus === 'dirty' && (
                                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                  uncommitted
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Rig: {member.rig} • Branch: {member.branch} • Status: {member.status}
                            </div>
                            {member.lastActivity && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Last activity: {member.lastActivity}
                              </div>
                            )}

                            {/* Message Box */}
                            {selectedWorker?.type === 'crew' && selectedWorker.id === member.id && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                  placeholder="Type your message..."
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleNudge(member.name, member.rig, 'crew')}
                                    disabled={isSending || !messageText.trim()}
                                    size="sm"
                                  >
                                    {isSending ? 'Sending...' : 'Send'}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedWorker(null);
                                      setMessageText('');
                                    }}
                                    variant="outline"
                                    size="sm"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {(!selectedWorker || selectedWorker.type !== 'crew' || selectedWorker.id !== member.id) && (
                          <div className="flex gap-2">
                            {member.status === 'stopped' ? (
                              <Button
                                onClick={() => handleCrewStart(member.name, member.rig)}
                                variant="outline"
                                size="sm"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
                              >
                                Start
                              </Button>
                            ) : (
                              <>
                                <Button
                                  onClick={() => setSelectedWorker({ type: 'crew', id: member.id })}
                                  variant="outline"
                                  size="sm"
                                >
                                  Message
                                </Button>
                                <Button
                                  onClick={() => handleCrewRefresh(member.name, member.rig)}
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900"
                                >
                                  Refresh
                                </Button>
                                <Button
                                  onClick={() => handleCrewRestart(member.name, member.rig)}
                                  variant="outline"
                                  size="sm"
                                  className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900"
                                >
                                  Restart
                                </Button>
                                <Button
                                  onClick={() => handleCrewStop(member.name, member.rig)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Stop
                                </Button>
                              </>
                            )}
                            <Button
                              onClick={() => handleCrewRemove(member.name, member.rig)}
                              variant="destructive"
                              size="sm"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Polecats Section */}
            {polecats.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  Polecats ({polecats.length})
                </h2>
                <div className="space-y-3">
                  {polecats.map((polecat) => (
                    <div
                      key={polecat.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* Status Dot */}
                          <div className="mt-1">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                polecat.status === 'active'
                                  ? 'bg-emerald-500'
                                  : polecat.status === 'idle'
                                  ? 'bg-blue-500'
                                  : polecat.status === 'error'
                                  ? 'bg-destructive'
                                  : 'bg-muted-foreground'
                              }`}
                            />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-foreground">
                                {polecat.name}
                              </span>
                              {polecat.unread_mail > 0 && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {polecat.unread_mail} mail
                                </span>
                              )}
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {polecat.status}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Rig: {polecat.rig}
                              {polecat.hooked_work && ` • Hooked: ${polecat.hooked_work}`}
                            </div>

                            {/* Message Box */}
                            {selectedWorker?.type === 'polecat' && selectedWorker.id === polecat.id && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                  placeholder="Type your message..."
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleNudge(polecat.name, polecat.rig, 'polecat')}
                                    disabled={isSending || !messageText.trim()}
                                    size="sm"
                                  >
                                    {isSending ? 'Sending...' : 'Send'}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedWorker(null);
                                      setMessageText('');
                                    }}
                                    variant="outline"
                                    size="sm"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {(!selectedWorker || selectedWorker.type !== 'polecat' || selectedWorker.id !== polecat.id) && (
                          <div className="flex gap-2">
                            {(polecat.status === 'active' || polecat.status === 'idle') ? (
                              <>
                                <Button
                                  onClick={() => handleViewSession(polecat.name)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Session
                                </Button>
                                <Button
                                  onClick={() => setSelectedWorker({ type: 'polecat', id: polecat.id })}
                                  variant="outline"
                                  size="sm"
                                >
                                  Nudge
                                </Button>
                                <Button
                                  onClick={() => handlePolecatRestart(polecat.name, polecat.rig)}
                                  variant="outline"
                                  size="sm"
                                  className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900"
                                >
                                  Restart
                                </Button>
                                <Button
                                  onClick={() => handlePolecatStop(polecat.name, polecat.rig)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Stop
                                </Button>
                              </>
                            ) : (
                              <Button
                                onClick={() => handlePolecatStart(polecat.name, polecat.rig)}
                                variant="outline"
                                size="sm"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
                              >
                                Start
                              </Button>
                            )}
                            <Button
                              onClick={() => handleNuke(polecat.name, polecat.rig)}
                              variant="destructive"
                              size="sm"
                            >
                              Nuke
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalWorkers === 0 && !isLoading && (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">No workers found</p>
              </div>
            )}
          </div>
        )}

        {/* Session Viewer Modal */}
        {sessionView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl rounded-lg border border-border bg-card shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Session: {sessionView.name}
                </h3>
                <button
                  onClick={() => setSessionView(null)}
                  className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Session Output */}
              <div className="max-h-[70vh] overflow-auto bg-zinc-950 p-4">
                <pre className="font-mono text-xs text-zinc-100 whitespace-pre-wrap">
                  {sessionView.output}
                </pre>
              </div>

              {/* Footer */}
              <div className="flex justify-between border-t border-border p-4">
                <p className="text-xs text-muted-foreground">
                  Tip: Use 'gt attach {sessionView.name}' for interactive terminal access
                </p>
                <Button
                  onClick={() => handleViewSession(sessionView.name)}
                  disabled={isLoadingSession}
                  variant="secondary"
                  size="sm"
                >
                  {isLoadingSession ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
