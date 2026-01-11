'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn, formatRelativeTime } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'sent' | 'received';
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll for Mayor responses
  useEffect(() => {
    const pollResponses = async () => {
      try {
        const response = await fetch('/api/chat/poll');
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMessages = data.messages.filter(
                (m: ChatMessage) => !existingIds.has(m.id)
              );
              return [...prev, ...newMessages];
            });
          }
        }
      } catch (error) {
        console.error('Error polling for responses:', error);
      }
    };

    const interval = setInterval(pollResponses, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `sent-${Date.now()}`,
      role: 'sent',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'received',
          content: 'Failed to send message. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-zinc-950 rounded-lg border border-zinc-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Control Plane</h2>
          <p className="text-xs text-zinc-500">Chat with Mayor</p>
        </div>
        <button
          onClick={handleClearHistory}
          className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Clear History
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm">
              No messages yet. Send a message to Mayor.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', {
                'justify-end': message.role === 'sent',
                'justify-start': message.role === 'received',
              })}
            >
              <div
                className={cn('max-w-[80%] rounded-lg px-4 py-2', {
                  'bg-blue-600/20 border border-blue-500/30 text-blue-100':
                    message.role === 'sent',
                  'bg-zinc-800/50 border border-zinc-700 text-zinc-200':
                    message.role === 'received',
                })}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={cn('text-xs mt-1', {
                    'text-blue-400/60': message.role === 'sent',
                    'text-zinc-500': message.role === 'received',
                  })}
                >
                  {formatRelativeTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message to Mayor..."
            rows={2}
            className={cn(
              'flex-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-100',
              'px-3 py-2 text-sm placeholder:text-zinc-600 resize-none',
              'focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600'
            )}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              'px-4 py-2 rounded text-sm font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
