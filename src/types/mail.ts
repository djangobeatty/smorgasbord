/**
 * Types for Gas Town mail system
 */

export interface MailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
  // Thread and reply info
  threadId?: string;
  replyTo?: string;
  // Message metadata
  priority?: string;  // 'normal', 'high', 'low', etc.
  messageType?: string;  // 'task', 'scavenge', 'notification', 'reply', etc.
  labels?: string[];
  ephemeral?: boolean;
}

export interface MailThread {
  id: string;
  subject: string;
  messages: MailMessage[];
  latestTimestamp: string;
  unreadCount: number;
  participants: string[];
}

export interface MailboxState {
  messages: MailMessage[];
  unreadCount: number;
}

export type MailFolder = 'inbox' | 'sent';
