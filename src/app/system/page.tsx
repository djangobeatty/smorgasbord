'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWitnesses, useRefineries } from '@/lib/use-beads';
import { useGtStatus } from '@/lib/use-gt-status';
import { NavBar } from '@/components/layout';
import { PromptModal, ConfirmModal } from '@/components/settings';

// Stable options object for manual-only refresh (defined outside component to avoid re-creation)
const MANUAL_REFRESH_OPTIONS = { pollingInterval: 0 } as const;

export default function SystemPage() {
  // Disable auto-refresh on Engine Room - all refreshes are manual only
  const { witnesses, isLoading: witnessesLoading, refresh: refreshWitnesses } = useWitnesses(MANUAL_REFRESH_OPTIONS);
  const { refineries, isLoading: refineriesLoading, refresh: refreshRefineries } = useRefineries(MANUAL_REFRESH_OPTIONS);
  const { status: gtStatus, isLoading: gtLoading, refresh: refreshGtStatus } = useGtStatus(MANUAL_REFRESH_OPTIONS);

  // Track initial load completion to prevent flashing empty states during fast API responses
  const [witnessesInitiallyLoaded, setWitnessesInitiallyLoaded] = useState(false);
  const [refineriesInitiallyLoaded, setRefineriesInitiallyLoaded] = useState(false);

  useEffect(() => {
    if (!witnessesLoading) {
      setWitnessesInitiallyLoaded(true);
    }
  }, [witnessesLoading]);

  useEffect(() => {
    if (!refineriesLoading) {
      setRefineriesInitiallyLoaded(true);
    }
  }, [refineriesLoading]);

  const isLoading = gtLoading; // Only block page for gt status (needed for Mayor/Deacon stats)
  const refresh = useCallback(async () => {
    await Promise.all([refreshWitnesses(), refreshRefineries(), refreshGtStatus()]);
  }, [refreshWitnesses, refreshRefineries, refreshGtStatus]);

  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState<{ [key: string]: boolean }>({});
  const [dogsOutput, setDogsOutput] = useState<string>('');
  const [bootOutput, setBootOutput] = useState<string>('');
  const [doctorOutput, setDoctorOutput] = useState<string>('Click "Run Checks" to run workspace health diagnostics.\nThis checks configuration, infrastructure, and can detect common issues.');

  // Mail modal state
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailRecipient, setMailRecipient] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);

  // Nudge modal state
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [nudgeTarget, setNudgeTarget] = useState('');
  const [nudgeEndpoint, setNudgeEndpoint] = useState('');
  const [nudgeParams, setNudgeParams] = useState<any>({});
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [isSendingNudge, setIsSendingNudge] = useState(false);

  // Health state modal
  const [isHealthStateModalOpen, setIsHealthStateModalOpen] = useState(false);
  const [healthStateOutput, setHealthStateOutput] = useState('');

  // Output modal (for refinery status, queue, etc.)
  const [outputModal, setOutputModal] = useState<{ title: string; output: string } | null>(null);

  // Prompt modal state
  const [promptModal, setPromptModal] = useState<{
    title: string;
    message: string;
    placeholder: string;
    onConfirm: (value: string) => void;
  } | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
  } | null>(null);

  // Find mayor and deacon agents in gtStatus
  // Mayor: check by name OR role (role is 'coordinator')
  const mayorAgent = gtStatus?.agents?.find(
    a => a.name.toLowerCase() === 'mayor' || a.role === 'coordinator' || a.role === 'mayor'
  );
  // Deacon: check by name OR role (deacon may have role='health-check' or role='deacon')
  const deaconAgent = gtStatus?.agents?.find(
    a => a.name.toLowerCase() === 'deacon' || a.role === 'health-check' || a.role === 'deacon'
  );
  // Use undefined for unknown status (agent not found in data), vs false for explicitly stopped
  const deaconAlive = deaconAgent?.running;
  const mayorRunning = mayorAgent?.running;

  const activeWitnesses = witnesses.filter(w => w.status === 'active').length;
  const stoppedWitnesses = witnesses.filter(w => w.status === 'stopped').length;

  // Individual mailbox counts
  const mayorMail = mayorAgent?.unread_mail ?? 0;
  const deaconMail = deaconAgent?.unread_mail ?? 0;
  const witnessesMail = witnesses.reduce((sum, w) => sum + w.unread_mail, 0);
  const refineriesMail = refineries.reduce((sum, r) => sum + r.unread_mail, 0);

  // Load dogs and boot status on mount (doctor is manual only due to long runtime)
  useEffect(() => {
    loadDogsStatus();
    loadBootStatus();
  }, []);

  const loadDogsStatus = async () => {
    try {
      const response = await fetch('/api/dogs/status');
      const data = await response.json();
      setDogsOutput(data.output || 'No dogs configured');
    } catch (error) {
      setDogsOutput('Failed to load dogs status');
    }
  };

  const loadBootStatus = async () => {
    try {
      const response = await fetch('/api/boot/status');
      const data = await response.json();
      setBootOutput(data.output || 'Boot status unavailable');
    } catch (error) {
      setBootOutput('Failed to load boot status');
    }
  };

  // Generic action handler
  const performAction = async (
    actionKey: string,
    actionFn: () => Promise<void>,
    successMessage: string
  ) => {
    setIsPerformingAction({ ...isPerformingAction, [actionKey]: true });
    setActionStatus(null);
    try {
      await actionFn();
      setActionStatus({ type: 'success', text: successMessage });
      setTimeout(() => refresh(), 2000);
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Action failed',
      });
    } finally {
      setIsPerformingAction({ ...isPerformingAction, [actionKey]: false });
    }
  };

  // Mayor actions
  const handleMayorRestart = async () => {
    await performAction('mayor-restart', async () => {
      const response = await fetch('/api/mayor/restart', {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restart mayor');
      }
    }, 'Mayor restart initiated');
  };

  // Deacon actions
  const handleDeaconAction = async (action: string) => {
    await performAction(`deacon-${action}`, async () => {
      const response = await fetch('/api/deacon/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(`Failed to ${action} deacon`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || result.message);
    }, `Deacon ${action} initiated`);
  };

  const handleDeaconSweep = async () => {
    await performAction('deacon-sweep', async () => {
      const response = await fetch('/api/deacon/sweep', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to sweep orphaned beads');
    }, 'Orphaned beads sweep completed');
  };

  const handleDeaconStaleHooks = async () => {
    await performAction('deacon-stale-hooks', async () => {
      const response = await fetch('/api/deacon/stale-hooks', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to unhook stale beads');
    }, 'Stale hooks unhooked');
  };

  const handleDeaconTriggerPending = async () => {
    await performAction('deacon-trigger-pending', async () => {
      const response = await fetch('/api/deacon/trigger-pending', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to trigger pending spawns');
    }, 'Pending spawns triggered');
  };

  const handleDeaconForceKill = () => {
    setPromptModal({
      title: 'Force Kill Session',
      message: 'Enter the session name to force-kill:',
      placeholder: 'e.g., gt-deck_editor-furiosa',
      onConfirm: async (session) => {
        setPromptModal(null);
        await performAction('deacon-force-kill', async () => {
          const response = await fetch('/api/deacon/force-kill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session }),
          });
          if (!response.ok) throw new Error('Failed to force-kill session');
        }, `Force-killed session ${session}`);
      },
    });
  };

  const handleDeaconHealthState = async () => {
    try {
      const response = await fetch('/api/deacon/health-state');
      if (!response.ok) throw new Error('Failed to get health state');
      const data = await response.json();
      setHealthStateOutput(data.output);
      setIsHealthStateModalOpen(true);
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to get health state',
      });
    }
  };

  // Witness actions
  const handleWitnessAction = async (rig: string, action: string) => {
    const endpoint = `/api/witness/${action}`;
    await performAction(`witness-${action}-${rig}`, async () => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} witness`);
      }
    }, `Witness ${action} for ${rig} completed`);
  };

  // Generic nudge handler
  const handleNudge = (endpoint: string, params: any, target: string) => {
    setNudgeTarget(target);
    setNudgeEndpoint(endpoint);
    setNudgeParams(params);
    setNudgeMessage('');
    setIsNudgeModalOpen(true);
  };

  const handleSendNudge = async () => {
    setIsSendingNudge(true);
    try {
      const response = await fetch(nudgeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nudgeParams, message: nudgeMessage }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
      setActionStatus({ type: 'success', text: `Nudge sent to ${nudgeTarget}` });
      setIsNudgeModalOpen(false);
      setNudgeMessage('');
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to nudge',
      });
    } finally {
      setIsSendingNudge(false);
    }
  };

  // Refinery actions
  const handleRefineryAction = async (rig: string, action: string) => {
    const endpoint = `/api/refinery/${action}`;
    await performAction(`refinery-${action}-${rig}`, async () => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} refinery`);
      }
    }, `Refinery ${action} for ${rig} completed`);
  };

  const handleRefineryView = async (rig: string, action: string) => {
    await performAction(`refinery-${action}-${rig}`, async () => {
      const response = await fetch(`/api/refinery/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });
      if (!response.ok) throw new Error(`Failed to get refinery ${action}`);
      const data = await response.json();
      setOutputModal({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} - ${rig}`,
        output: data.output || 'No output',
      });
    }, `Retrieved refinery ${action}`);
  };

  // Dogs actions
  const handleDogAction = async (action: string, name?: string) => {
    const endpoint = `/api/dogs/${action}`;
    await performAction(`dog-${action}`, async () => {
      const response = await fetch(endpoint, {
        method: action === 'list' || action === 'status' ? 'GET' : 'POST',
        ...(name && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }),
      });
      if (!response.ok) throw new Error(`Failed to ${action} dog`);
      if (action === 'list' || action === 'status') {
        const data = await response.json();
        setDogsOutput(data.output || 'No output');
      }
    }, `Dog ${action} completed`);
  };

  const handleDoctorAction = async (withFix: boolean) => {
    const actionKey = withFix ? 'doctor-fix' : 'doctor-check';
    const endpoint = withFix ? '/api/doctor/fix' : '/api/doctor/check';

    // Show running state in the output area
    setDoctorOutput(`Running doctor ${withFix ? '--fix' : 'checks'}... (this may take a few minutes)`);
    setIsPerformingAction(prev => ({ ...prev, [actionKey]: true }));
    setActionStatus(null);

    try {
      const response = await fetch(endpoint, {
        method: withFix ? 'POST' : 'GET',
      });
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details || data.error || `Failed to run doctor ${withFix ? 'fix' : 'checks'}`;
        setDoctorOutput(`ERROR: ${errorMsg}`);
        setActionStatus({ type: 'error', text: errorMsg });
        return;
      }

      setDoctorOutput(data.output || 'Doctor completed with no output');
      setActionStatus({ type: 'success', text: `Doctor ${withFix ? 'fix' : 'checks'} completed` });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setDoctorOutput(`ERROR: ${errorMsg}\n\nThis could be a timeout - doctor checks can take several minutes.`);
      setActionStatus({ type: 'error', text: errorMsg });
    } finally {
      setIsPerformingAction(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Boot actions
  const handleBootAction = async (action: string) => {
    await performAction(`boot-${action}`, async () => {
      const response = await fetch(`/api/boot/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(`Failed to ${action} boot`);
      const data = await response.json();
      setBootOutput(data.output || `Boot ${action} completed`);
    }, `Boot ${action} completed`);
  };

  // Mail modal handlers
  const handleOpenMail = (recipient: string) => {
    setMailRecipient(recipient);
    setMailSubject('');
    setMailBody('');
    setIsMailModalOpen(true);
  };

  const handleSendMail = async () => {
    if (!mailRecipient || !mailSubject || !mailBody) {
      setActionStatus({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setIsSendingMail(true);
    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: mailRecipient,
          subject: mailSubject,
          body: mailBody,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send mail');
      }

      setActionStatus({ type: 'success', text: `Mail sent to ${mailRecipient}` });
      setIsMailModalOpen(false);
      setMailRecipient('');
      setMailSubject('');
      setMailBody('');
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send mail',
      });
    } finally {
      setIsSendingMail(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Engine Room</h1>
          <button
            onClick={() => {
              refresh();
              loadDogsStatus();
              loadBootStatus();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Status Message */}
        {actionStatus && (
          <div className={`mb-4 rounded-md border p-3 ${actionStatus.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400'}`}>
            {actionStatus.text}
          </div>
        )}

        {/* Summary Stats - Individual Mailboxes */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Mayor Unread</div>
            <div className={`text-2xl font-bold ${mayorMail > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`}>{mayorMail}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Deacon Unread</div>
            <div className={`text-2xl font-bold ${deaconMail > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{deaconMail}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Witnesses Unread</div>
            <div className={`text-2xl font-bold ${witnessesMail > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>{witnessesMail}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Refineries Unread</div>
            <div className={`text-2xl font-bold ${refineriesMail > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{refineriesMail}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Active Witnesses</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeWitnesses}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Refineries</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{refineries.length}</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="mt-2 text-sm text-muted-foreground">Loading system status...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mayor Section */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Mayor</h2>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-3">
                    Chief-of-staff agent responsible for initiating Convoys and coordinating work distribution
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${mayorRunning === true ? 'bg-purple-500' : mayorRunning === false ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium text-foreground">
                        Status: {mayorRunning === true ? 'Running' : mayorRunning === false ? 'Stopped' : 'Unknown'}
                      </span>
                    </div>
                    {mayorMail > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {mayorMail} unread
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mayor Controls */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleMayorRestart()}
                    disabled={isPerformingAction['mayor-restart']}
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => handleNudge('/api/mayor/nudge', {}, 'mayor')}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
                  >
                    Nudge
                  </button>
                  <button
                    onClick={() => handleOpenMail('mayor')}
                    className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-400"
                  >
                    Mail
                  </button>
                </div>
              </div>
            </div>

            {/* Deacon Section */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Deacon</h2>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-3">
                    Daemon beacon running continuous Patrol cycles that monitor health and trigger recovery
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${deaconAlive === true ? 'bg-emerald-500' : deaconAlive === false ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium text-foreground">
                        Status: {deaconAlive === true ? 'Running' : deaconAlive === false ? 'Stopped' : 'Unknown'}
                      </span>
                    </div>
                    {deaconMail > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          {deaconMail} unread
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deacon Controls */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDeaconAction('start')}
                    disabled={isPerformingAction['deacon-start'] || deaconAlive === true}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => handleDeaconAction('stop')}
                    disabled={isPerformingAction['deacon-stop'] || deaconAlive !== true}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Stop
                  </button>
                  <button
                    onClick={() => handleDeaconAction('restart')}
                    disabled={isPerformingAction['deacon-restart']}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => handleDeaconAction('pause')}
                    disabled={isPerformingAction['deacon-pause'] || deaconAlive !== true}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => handleDeaconAction('resume')}
                    disabled={isPerformingAction['deacon-resume'] || deaconAlive !== true}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Resume
                  </button>
                  <button
                    onClick={handleDeaconSweep}
                    disabled={isPerformingAction['deacon-sweep']}
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                  >
                    Sweep Orphans
                  </button>
                  <button
                    onClick={handleDeaconStaleHooks}
                    disabled={isPerformingAction['deacon-stale-hooks']}
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                  >
                    Unhook Stale
                  </button>
                  <button
                    onClick={handleDeaconTriggerPending}
                    disabled={isPerformingAction['deacon-trigger-pending']}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
                  >
                    Trigger Pending
                  </button>
                  <button
                    onClick={handleDeaconForceKill}
                    disabled={isPerformingAction['deacon-force-kill']}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                  >
                    Force Kill
                  </button>
                  <button
                    onClick={handleDeaconHealthState}
                    disabled={isPerformingAction['deacon-health-state']}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Health State
                  </button>
                </div>
              </div>
            </div>

            {/* Witnesses Section */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Witnesses ({witnesses.length})</h2>
              <div className="mb-3 text-xs text-muted-foreground">
                Patrol agents that oversee Polecats and the Refinery, monitoring progress
              </div>
              {(!witnessesInitiallyLoaded || witnessesLoading) ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-3 w-3 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-32" />
                          <div className="h-3 bg-muted rounded w-48" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {[1, 2, 3, 4, 5].map((j) => (
                          <div key={j} className="h-8 bg-muted rounded" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : witnesses.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">No witnesses configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {witnesses.map((witness) => (
                    <div key={witness.rig} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            <div className={`h-3 w-3 rounded-full ${witness.status === 'active' ? 'bg-emerald-500' : witness.status === 'idle' ? 'bg-blue-500' : 'bg-muted-foreground/50'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-semibold text-foreground">{witness.rig}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${witness.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : witness.status === 'idle' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-muted text-muted-foreground'}`}>
                                {witness.status}
                              </span>
                              {witness.unread_mail > 0 && (
                                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                  {witness.unread_mail} mail
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>Rig patrol agent</div>
                              <div className="mt-1 font-mono text-xs text-muted-foreground/70">ID: {witness.id}</div>
                              {witness.last_check && (
                                <div className="mt-0.5 text-xs">Last check: {new Date(witness.last_check).toLocaleString()}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Witness Controls */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleWitnessAction(witness.rig, 'start')}
                          disabled={isPerformingAction[`witness-start-${witness.rig}`] || witness.status !== 'stopped'}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleWitnessAction(witness.rig, 'stop')}
                          disabled={isPerformingAction[`witness-stop-${witness.rig}`] || witness.status === 'stopped'}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          Stop
                        </button>
                        <button
                          onClick={() => handleWitnessAction(witness.rig, 'restart')}
                          disabled={isPerformingAction[`witness-restart-${witness.rig}`]}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          Restart
                        </button>
                        <button
                          onClick={() => handleNudge('/api/witness/nudge', { rig: witness.rig }, `witness ${witness.rig}`)}
                          disabled={witness.status === 'stopped'}
                          className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
                        >
                          Nudge
                        </button>
                        <button
                          onClick={() => handleOpenMail(`${witness.rig}/witness`)}
                          disabled={witness.status === 'stopped'}
                          className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-400"
                        >
                          Mail
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Refineries Section */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Refineries ({refineries.length})</h2>
              <div className="mb-3 text-xs text-muted-foreground">
                Manages the Merge Queue for a Rig, intelligently merging changes
              </div>
              {(!refineriesInitiallyLoaded || refineriesLoading) ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-3 w-3 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-32" />
                          <div className="h-3 bg-muted rounded w-48" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[1, 2, 3, 4].map((j) => (
                          <div key={j} className="h-8 bg-muted rounded" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : refineries.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">No refineries configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {refineries.map((refinery) => (
                    <div key={refinery.rig} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            <div className={`h-3 w-3 rounded-full ${refinery.status === 'processing' ? 'bg-emerald-500' : refinery.status === 'active' ? 'bg-blue-500' : refinery.status === 'error' ? 'bg-red-500' : 'bg-muted-foreground/50'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-semibold text-foreground">{refinery.rig}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${refinery.status === 'processing' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : refinery.status === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : refinery.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>
                                {refinery.status}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${refinery.queueDepth > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                                Queue: {refinery.queueDepth === 0 ? '0 (empty)' : refinery.queueDepth}
                              </span>
                              {refinery.unread_mail > 0 && (
                                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                  {refinery.unread_mail} mail
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>Merge queue management</div>
                              <div className="mt-1 font-mono text-xs text-muted-foreground/70">
                                ID: {refinery.id} | Agent: {refinery.agent_state}
                              </div>
                              {refinery.currentPR && (
                                <div className="mt-1 font-mono text-xs">
                                  Current: #{refinery.currentPR.number} - {refinery.currentPR.title}
                                </div>
                              )}
                              {refinery.lastProcessedAt && (
                                <div className="mt-0.5 text-xs">
                                  Last processed: {new Date(refinery.lastProcessedAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Refinery Controls */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleRefineryAction(refinery.rig, 'start')}
                          disabled={isPerformingAction[`refinery-start-${refinery.rig}`]}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleRefineryAction(refinery.rig, 'stop')}
                          disabled={isPerformingAction[`refinery-stop-${refinery.rig}`]}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                        >
                          Stop
                        </button>
                        <button
                          onClick={() => handleRefineryAction(refinery.rig, 'restart')}
                          disabled={isPerformingAction[`refinery-restart-${refinery.rig}`]}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          Restart
                        </button>
                        <button
                          onClick={() => handleRefineryView(refinery.rig, 'status')}
                          disabled={isPerformingAction[`refinery-status-${refinery.rig}`]}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          Status
                        </button>
                        <button
                          onClick={() => handleRefineryView(refinery.rig, 'queue')}
                          disabled={isPerformingAction[`refinery-queue-${refinery.rig}`]}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          View Queue
                        </button>
                        <button
                          onClick={() => handleRefineryView(refinery.rig, 'blocked')}
                          disabled={isPerformingAction[`refinery-blocked-${refinery.rig}`]}
                          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                        >
                          Blocked
                        </button>
                        <button
                          onClick={() => handleRefineryView(refinery.rig, 'ready')}
                          disabled={isPerformingAction[`refinery-ready-${refinery.rig}`]}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                        >
                          Ready
                        </button>
                        <button
                          onClick={() => handleNudge('/api/refinery/nudge', { rig: refinery.rig }, `refinery ${refinery.rig}`)}
                          className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
                        >
                          Nudge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dogs Section */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Dogs</h2>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-3">
                    The Deacon's crew of maintenance agents handling background tasks
                  </div>
                  <div className="text-sm font-medium text-foreground mb-2">Status Output:</div>
                  <pre className="rounded bg-muted p-3 text-xs text-foreground overflow-x-auto">{dogsOutput}</pre>
                </div>

                {/* Dogs Controls */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDogAction('list')}
                    disabled={isPerformingAction['dog-list']}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    List
                  </button>
                  <button
                    onClick={() => handleDogAction('status')}
                    disabled={isPerformingAction['dog-status']}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Refresh Status
                  </button>
                  <button
                    onClick={() => {
                      setPromptModal({
                        title: 'Add Dog',
                        message: 'Enter the name for the new dog:',
                        placeholder: 'e.g., patrol, cleanup',
                        onConfirm: (name) => {
                          setPromptModal(null);
                          handleDogAction('add', name);
                        },
                      });
                    }}
                    disabled={isPerformingAction['dog-add']}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                  >
                    Add Dog
                  </button>
                  <button
                    onClick={() => {
                      setPromptModal({
                        title: 'Call Dog',
                        message: 'Enter the name of the dog to call:',
                        placeholder: 'e.g., patrol, cleanup',
                        onConfirm: (name) => {
                          setPromptModal(null);
                          handleDogAction('call', name);
                        },
                      });
                    }}
                    disabled={isPerformingAction['dog-call']}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
                  >
                    Call Dog
                  </button>
                  <button
                    onClick={() => {
                      setPromptModal({
                        title: 'Remove Dog',
                        message: 'Enter the name of the dog to remove:',
                        placeholder: 'e.g., patrol, cleanup',
                        onConfirm: (name) => {
                          setPromptModal(null);
                          setConfirmModal({
                            title: 'Confirm Remove Dog',
                            message: `Are you sure you want to remove dog "${name}"?`,
                            variant: 'danger',
                            onConfirm: () => {
                              setConfirmModal(null);
                              handleDogAction('remove', name);
                            },
                          });
                        },
                      });
                    }}
                    disabled={isPerformingAction['dog-remove']}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                  >
                    Remove Dog
                  </button>
                </div>
              </div>
            </div>

            {/* Boot Section */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Boot</h2>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-3">
                    Special Dog that checks Deacon functionality every 5 minutes
                  </div>
                  <div className="text-sm font-medium text-foreground mb-2">Status Output:</div>
                  <pre className="rounded bg-muted p-3 text-xs text-foreground overflow-x-auto">{bootOutput}</pre>
                </div>

                {/* Boot Controls */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      loadBootStatus();
                      setActionStatus({ type: 'success', text: 'Boot status refreshed' });
                    }}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    Refresh Status
                  </button>
                  <button
                    onClick={() => handleBootAction('spawn')}
                    disabled={isPerformingAction['boot-spawn']}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                  >
                    Spawn
                  </button>
                  <button
                    onClick={() => handleBootAction('triage')}
                    disabled={isPerformingAction['boot-triage']}
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                  >
                    Run Triage
                  </button>
                  <button
                    onClick={() => handleOpenMail('boot')}
                    className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-400"
                  >
                    Mail
                  </button>
                </div>
              </div>
            </div>

            {/* Doctor Section */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Doctor</h2>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-3">
                    Diagnostic tool that runs health checks on the workspace and can automatically fix common issues
                  </div>
                  <div className="text-sm font-medium text-foreground mb-2">Diagnostic Output:</div>
                  <pre className="rounded bg-muted p-3 text-xs text-foreground overflow-x-auto">{doctorOutput}</pre>
                </div>

                {/* Doctor Controls */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDoctorAction(false)}
                    disabled={isPerformingAction['doctor-check'] || isPerformingAction['doctor-fix']}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {isPerformingAction['doctor-check'] ? 'Running...' : 'Run Checks'}
                  </button>
                  <button
                    onClick={() => handleDoctorAction(true)}
                    disabled={isPerformingAction['doctor-fix'] || isPerformingAction['doctor-check']}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                  >
                    {isPerformingAction['doctor-fix'] ? 'Running...' : 'Run & Fix'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mail Compose Modal */}
      {isMailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsMailModalOpen(false)}>
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Compose Message</h3>
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
                <label className="mb-1 block text-sm font-medium text-foreground">To</label>
                <input
                  type="text"
                  value={mailRecipient}
                  onChange={(e) => setMailRecipient(e.target.value)}
                  placeholder="Agent name"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Subject</label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Message</label>
                <textarea
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  placeholder="Message"
                  rows={8}
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
                  disabled={isSendingMail || !mailRecipient || !mailSubject || !mailBody}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSendingMail ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nudge Modal */}
      {isNudgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsNudgeModalOpen(false)}>
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Nudge {nudgeTarget}</h3>
              <button
                onClick={() => setIsNudgeModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Message</label>
                <textarea
                  value={nudgeMessage}
                  onChange={(e) => setNudgeMessage(e.target.value)}
                  placeholder="Enter your nudge message..."
                  rows={6}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsNudgeModalOpen(false)}
                  disabled={isSendingNudge}
                  className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNudge}
                  disabled={isSendingNudge}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSendingNudge ? 'Sending...' : 'Send Nudge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health State Modal */}
      {isHealthStateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsHealthStateModalOpen(false)}>
          <div className="w-full max-w-4xl rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Deacon Health State</h3>
              <button
                onClick={() => setIsHealthStateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted">
                <pre className="max-h-96 overflow-auto p-4 text-xs text-foreground whitespace-pre-wrap font-mono">
                  {healthStateOutput}
                </pre>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setIsHealthStateModalOpen(false)}
                  className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Output Modal (for refinery status, queue, etc.) */}
      {outputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOutputModal(null)}>
          <div className="w-full max-w-4xl rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{outputModal.title}</h3>
              <button
                onClick={() => setOutputModal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted">
                <pre className="max-h-96 overflow-auto p-4 text-xs text-foreground whitespace-pre-wrap font-mono">
                  {outputModal.output}
                </pre>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setOutputModal(null)}
                  className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptModal && (
        <PromptModal
          title={promptModal.title}
          message={promptModal.message}
          placeholder={promptModal.placeholder}
          onConfirm={promptModal.onConfirm}
          onCancel={() => setPromptModal(null)}
        />
      )}

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
