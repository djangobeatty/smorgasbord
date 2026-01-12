/**
 * API Route: GET /api/chat/crew/poll
 * Polls for crew member responses via gt mail inbox
 *
 * Query params:
 * - rig: Filter by rig name
 * - name: Filter by crew member name
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface ChatMessage {
  id: string;
  role: 'sent' | 'received';
  content: string;
  timestamp: string;
  from?: string;
}

interface MailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
}

// Track seen message IDs to avoid duplicates
const seenMessageIds = new Set<string>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rig = searchParams.get('rig');
    const name = searchParams.get('name');

    const messages: ChatMessage[] = [];
    const basePath = process.env.GT_BASE_PATH ?? process.cwd();

    try {
      // Get mail inbox in JSON format
      const { stdout } = await execAsync('gt mail inbox --json', {
        cwd: basePath,
        timeout: 10000,
      });

      const mailMessages: MailMessage[] = JSON.parse(stdout || '[]');

      // Build filter pattern for crew messages: <rig>/crew/<name>
      let filterPattern: string | null = null;
      if (rig && name) {
        filterPattern = `${rig}/crew/${name}`;
      } else if (rig) {
        filterPattern = `${rig}/crew/`;
      } else if (name) {
        filterPattern = `/crew/${name}`;
      }

      for (const mail of mailMessages) {
        // Skip if we've already seen this message
        if (seenMessageIds.has(mail.id)) {
          continue;
        }

        // Check if message is from a crew member (format: <rig>/crew/<name>)
        const isFromCrew = mail.from.includes('/crew/');

        if (!isFromCrew) {
          continue;
        }

        // Apply filter if specified
        if (filterPattern && !mail.from.includes(filterPattern)) {
          continue;
        }

        seenMessageIds.add(mail.id);
        messages.push({
          id: mail.id,
          role: 'received',
          content: mail.body || mail.subject,
          timestamp: mail.timestamp,
          from: mail.from,
        });
      }
    } catch (error) {
      // Mail command might not be available or inbox empty
      console.error('Error polling crew mail:', error);
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error polling for messages:', error);
    return NextResponse.json({ messages: [] });
  }
}
