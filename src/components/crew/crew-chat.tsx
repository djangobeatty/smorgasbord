'use client';

import { useState, useRef, useEffect } from 'react';
import { useCrewInbox } from '@/lib/use-crew';
import { formatRelativeTime } from '@/lib/utils';
import type { CrewMember } from '@/types/crew';

interface CrewChatProps {
  member: CrewMember | null;
  onSendMessage?: (to: string, subject: string, message: string) => Promise<void>;
  className?: string;
}

export function CrewChat({ member, onSendMessage, className = '' }: CrewChatProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const memberId = member ? `${member.rig}/crew/${member.name}` : '';
  const { messages, unreadCount, isLoading, refresh } = useCrewInbox({
    member: memberId,
    pollInterval: member ? 5000 : 0,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !member || !onSendMessage) return;

    setSending(true);
    setError(null);

    try {
      await onSendMessage(
        `${member.rig}/crew/${member.name}`,
        'Dashboard Message',
        message
      );
      setMessage('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!member) {
    return (
      <div
        className={`rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 flex items-center justify-center ${className}`}
      >
        <p className="text-sm text-zinc-500">
          Select a crew member to view their inbox
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-zinc-900/50 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{member.name}</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              {unreadCount} unread
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500">{member.rig}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && messages.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center">
            No messages yet. Send a message to start the conversation.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[80%] rounded-lg border p-3 ${
                msg.from === 'dashboard'
                  ? 'ml-auto bg-blue-500/10 border-blue-500/30'
                  : 'bg-zinc-800/50 border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-zinc-400">
                  {msg.from}
                </span>
                <span className="text-xs text-zinc-600">
                  {formatRelativeTime(msg.timestamp)}
                </span>
              </div>
              {msg.subject && (
                <div className="text-xs text-zinc-500 mb-1">{msg.subject}</div>
              )}
              <p className="text-sm text-white whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4">
        {error && (
          <p className="text-xs text-red-400 mb-2">{error}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${member.name}...`}
            rows={2}
            className="flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
