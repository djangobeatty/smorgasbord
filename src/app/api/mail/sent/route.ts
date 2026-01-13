/**
 * API Route: GET /api/mail/sent
 * Get sent messages for the overseer (human user)
 */

import { NextResponse } from 'next/server';
import type { MailMessage } from '@/types/mail';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface SentResponse {
  messages: MailMessage[];
  totalCount: number;
}

export async function GET() {
  try {
    // Get all messages (including closed) and filter by created_by='overseer' client-side
    // Using --all because messages may be closed after being read/processed
    // Using bd list without --label filter since gt mail send doesn't consistently add from:overseer label
    const { stdout } = await execGt(
      `bd list --type message --all --json --limit 200 2>/dev/null || echo "[]"`,
      {
        timeout: 10000,
        cwd: process.env.GT_BASE_PATH || process.cwd(),
      }
    );

    let messages: MailMessage[] = [];

    try {
      const parsed = JSON.parse(stdout.trim() || '[]');
      if (Array.isArray(parsed)) {
        // Filter to only messages created by overseer (sent messages)
        const sentMessages = parsed.filter((msg: Record<string, unknown>) =>
          msg.created_by === 'overseer'
        );

        messages = sentMessages.map((msg: Record<string, unknown>) => {
          // Extract thread ID and reply-to from labels
          const labels = (msg.labels as string[]) || [];
          const threadLabel = labels.find((l: string) => l.startsWith('thread:'));
          const replyToLabel = labels.find((l: string) => l.startsWith('reply-to:'));

          return {
            id: msg.id as string || '',
            from: msg.created_by as string || 'overseer',
            to: msg.assignee as string || '',
            subject: msg.title as string || '(no subject)',
            body: msg.description as string || '',
            timestamp: msg.created_at as string || new Date().toISOString(),
            read: true, // Sent messages are always "read"
            // Label is "thread:thread-xxx", extract just the value after the colon
            threadId: threadLabel ? threadLabel.replace('thread:', '') : undefined,
            replyTo: replyToLabel ? replyToLabel.replace('reply-to:', '') : undefined,
            priority: msg.priority as string,
            labels: labels,
            ephemeral: msg.ephemeral as boolean,
          };
        });

        // Sort by timestamp descending (newest first)
        messages.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
    } catch (parseError) {
      console.error('Failed to parse sent messages:', parseError);
    }

    const response: SentResponse = {
      messages,
      totalCount: messages.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    return NextResponse.json({
      messages: [],
      totalCount: 0,
    });
  }
}
