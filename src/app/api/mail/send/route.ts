/**
 * API Route: POST /api/mail/send
 * Sends a message to a Gas Town agent via gt mail command
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface SendMailRequest {
  to: string;
  subject?: string;
  body: string;
  replyTo?: string; // Message ID to reply to (for threading)
}

export async function POST(request: NextRequest) {
  try {
    const requestBody: SendMailRequest = await request.json();

    if (!requestBody.to || typeof requestBody.to !== 'string') {
      return NextResponse.json(
        { error: 'Recipient (to) is required' },
        { status: 400 }
      );
    }

    if (!requestBody.body || typeof requestBody.body !== 'string') {
      return NextResponse.json(
        { error: 'Message body is required' },
        { status: 400 }
      );
    }

    const to = requestBody.to.trim();
    const subject = requestBody.subject?.trim() || '';
    const body = requestBody.body.trim();

    if (to.length === 0 || body.length === 0) {
      return NextResponse.json(
        { error: 'Recipient and body must be non-empty' },
        { status: 400 }
      );
    }

    if (body.length > 5000) {
      return NextResponse.json(
        { error: 'Message body too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Escape for shell safety
    const escapedTo = to.replace(/'/g, "'\\''");
    const escapedBody = body.replace(/'/g, "'\\''");
    const replyTo = requestBody.replyTo?.trim();

    try {
      // Execute gt mail send command
      // Format: gt mail send <recipient> [-s '<subject>'] -m '<body>' [--reply-to <id>] [--type reply]
      let cmd = `gt mail send '${escapedTo}'`;
      if (subject) {
        const escapedSubject = subject.replace(/'/g, "'\\''");
        cmd += ` -s '${escapedSubject}'`;
      }
      cmd += ` -m '${escapedBody}'`;

      // Add reply-to for threading
      if (replyTo) {
        const escapedReplyTo = replyTo.replace(/'/g, "'\\''");
        cmd += ` --reply-to '${escapedReplyTo}' --type reply`;
      }

      const { stdout, stderr } = await execGt(cmd,
        {
          timeout: 10000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        }
      );

      return NextResponse.json({
        success: true,
        message: `Mail sent to ${to}`,
        output: stdout.trim(),
      });
    } catch (execError) {
      // If gt command fails, log but return appropriate error
      console.error('gt mail command failed:', execError);

      return NextResponse.json(
        {
          error: 'Failed to send mail',
          details: execError instanceof Error ? execError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in mail send endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send mail' },
      { status: 500 }
    );
  }
}
