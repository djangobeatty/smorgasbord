'use client';

import { useState } from 'react';
import { useCrewStatus } from '@/lib/use-crew';
import { formatRelativeTime } from '@/lib/utils';
import type { CrewMember } from '@/types/crew';

interface CrewPanelProps {
  onSelectMember?: (member: CrewMember) => void;
  selectedMemberId?: string;
}

export function CrewPanel({ onSelectMember, selectedMemberId }: CrewPanelProps) {
  const { crewState, isLoading, error, refresh, sendMail } = useCrewStatus();
  const [nudgeTarget, setNudgeTarget] = useState<string | null>(null);
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [sendingNudge, setSendingNudge] = useState(false);

  const handleSendNudge = async (member: CrewMember) => {
    if (!nudgeMessage.trim()) return;

    setSendingNudge(true);
    try {
      await sendMail(
        `${member.rig}/crew/${member.name}`,
        'Dashboard Nudge',
        nudgeMessage
      );
      setNudgeMessage('');
      setNudgeTarget(null);
    } catch (err) {
      console.error('Failed to send nudge:', err);
    } finally {
      setSendingNudge(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-zinc-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-zinc-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'stopped':
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  if (isLoading && !crewState) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-white">Crew</h3>
        </div>
        <p className="text-sm text-zinc-500">Loading crew members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-white">Crew</h3>
        </div>
        <p className="text-sm text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  const members = crewState?.members ?? [];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Crew</h3>
          <span className="text-sm text-zinc-500">
            {crewState?.runningCount ?? 0} / {crewState?.totalCount ?? 0} running
          </span>
        </div>
        <button
          onClick={() => refresh()}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Refresh
        </button>
      </div>

      {/* Member List */}
      {members.length === 0 ? (
        <p className="text-sm text-zinc-500">No crew members found.</p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedMemberId === member.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
              onClick={() => onSelectMember?.(member)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`}
                  />
                  <span className="font-medium text-white">{member.name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                      member.status
                    )}`}
                  >
                    {member.status}
                  </span>
                </div>
                {member.mailCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {member.mailCount} mail
                  </span>
                )}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <span>Branch: {member.branch}</span>
                  <span>
                    Git:{' '}
                    <span
                      className={
                        member.gitStatus === 'dirty'
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }
                    >
                      {member.gitStatus}
                    </span>
                  </span>
                </div>
                <div className="mt-1 text-zinc-600 truncate">{member.rig}</div>
              </div>

              {/* Nudge Input */}
              {nudgeTarget === member.id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={nudgeMessage}
                    onChange={(e) => setNudgeMessage(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendNudge(member);
                      }
                      if (e.key === 'Escape') {
                        setNudgeTarget(null);
                        setNudgeMessage('');
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSendNudge(member)}
                    disabled={sendingNudge || !nudgeMessage.trim()}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sendingNudge ? '...' : 'Send'}
                  </button>
                  <button
                    onClick={() => {
                      setNudgeTarget(null);
                      setNudgeMessage('');
                    }}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNudgeTarget(member.id);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Send message
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
