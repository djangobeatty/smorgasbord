/**
 * API Route: GET /api/mail/inbox
 * Get inbox for the overseer (human user)
 */

import { NextResponse } from 'next/server';
import type { MailMessage } from '@/types/mail';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface InboxResponse {
  messages: MailMessage[];
  unreadCount: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') || 'overseer';

    // Use gt mail inbox which returns proper thread_id and reply_to fields
    const { stdout } = await execGt(
      `gt mail inbox ${address} --json 2>/dev/null || echo "[]"`,
      {
        timeout: 10000,
        cwd: process.env.GT_BASE_PATH || process.cwd(),
      }
    );

    let messages: MailMessage[] = [];
    let unreadCount = 0;

    try {
      const parsed = JSON.parse(stdout.trim() || '[]');
      if (Array.isArray(parsed)) {
        messages = parsed.map((msg: Record<string, unknown>) => {
          const isRead = msg.read as boolean ?? false;
          if (!isRead) unreadCount++;

          return {
            id: msg.id as string || '',
            from: msg.from as string || 'unknown',
            to: msg.to as string || address,
            subject: msg.subject as string || '(no subject)',
            body: msg.body as string || msg.content as string || '',
            timestamp: msg.timestamp as string || msg.date as string || new Date().toISOString(),
            read: isRead,
            // thread_id and reply_to come directly from gt mail inbox
            threadId: msg.thread_id as string | undefined,
            replyTo: msg.reply_to as string | undefined,
            priority: msg.priority as string | undefined,
            messageType: msg.type as string | undefined,
          };
        });

        // Sort by timestamp descending (newest first)
        messages.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
    } catch (parseError) {
      console.error('Failed to parse inbox:', parseError);
    }

    const response: InboxResponse = {
      messages,
      unreadCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching mail inbox:', error);
    return NextResponse.json({
      messages: [],
      unreadCount: 0,
    });
  }
}
