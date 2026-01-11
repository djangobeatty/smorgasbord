import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  id: string;
  role: 'sent' | 'received';
  content: string;
  timestamp: string;
}

// Store to track last read position
let lastReadPosition = 0;

export async function GET() {
  try {
    const messages: ChatMessage[] = [];

    // Try to read Mayor responses from session output or daemon log
    const beadsPath = join(process.cwd(), '..', '..', '..', '.beads');
    const daemonLogPath = join(beadsPath, 'daemon.log');

    try {
      const logContent = await readFile(daemonLogPath, 'utf-8');
      const lines = logContent.split('\n');

      // Parse Mayor messages from log
      // Look for patterns like [MAYOR] or mayor responses
      for (let i = lastReadPosition; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('[MAYOR]') || line.includes('mayor:')) {
          const match = line.match(
            /\[MAYOR\]\s*(.+)|mayor:\s*(.+)/i
          );
          if (match) {
            const content = match[1] || match[2];
            if (content && content.trim()) {
              messages.push({
                id: `received-${Date.now()}-${i}`,
                role: 'received',
                content: content.trim(),
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }

      lastReadPosition = lines.length;
    } catch {
      // Log file might not exist or be inaccessible
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error polling for messages:', error);
    return NextResponse.json({ messages: [] });
  }
}
