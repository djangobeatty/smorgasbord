/**
 * API Route: GET /api/crew/mail/inbox
 * Get inbox for a crew member
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { CrewMessage } from '@/types/crew';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface InboxResponse {
  messages: CrewMessage[];
  unreadCount: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const member = searchParams.get('member');

    if (!member) {
      return NextResponse.json(
        { error: 'Missing member parameter' },
        { status: 400 }
      );
    }

    // Get inbox for the crew member by running command in their directory
    // Format: gt_dashboard/crew/dashboard_dev -> crew/dashboard_dev worktree path
    const memberName = member.split('/').pop();

    // Use gt mail inbox for the crew member
    const { stdout } = await execAsync(
      `gt mail inbox ${member}`,
      { timeout: 10000 }
    );

    // Parse inbox output
    const messages: CrewMessage[] = [];
    let unreadCount = 0;

    // Parse the inbox format (simplified parsing)
    const lines = stdout.split('\n');
    let currentMessage: Partial<CrewMessage> | null = null;

    for (const line of lines) {
      // Match message header: [unread] from: subject
      const headerMatch = line.match(/^\s*(\[unread\])?\s*(\S+):\s*(.+)/);
      if (headerMatch) {
        if (currentMessage && currentMessage.id) {
          messages.push(currentMessage as CrewMessage);
        }
        const isUnread = !!headerMatch[1];
        if (isUnread) unreadCount++;

        currentMessage = {
          id: `msg-${Date.now()}-${messages.length}`,
          from: headerMatch[2],
          to: member,
          subject: headerMatch[3],
          body: '',
          timestamp: new Date().toISOString(),
          read: !isUnread,
        };
        continue;
      }
    }

    if (currentMessage && currentMessage.id) {
      messages.push(currentMessage as CrewMessage);
    }

    const response: InboxResponse = {
      messages,
      unreadCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    // Return empty inbox on error (might not have mail setup)
    return NextResponse.json({
      messages: [],
      unreadCount: 0,
    });
  }
}
