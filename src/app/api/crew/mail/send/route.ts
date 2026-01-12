/**
 * API Route: POST /api/crew/mail/send
 * Send mail to a crew member
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface SendMailRequest {
  to: string;        // Address like "gt_dashboard/crew/dashboard_dev"
  subject: string;
  message: string;
}

export async function POST(request: Request) {
  try {
    const body: SendMailRequest = await request.json();
    const { to, subject, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    // Escape message for shell
    const escapedMessage = message.replace(/'/g, "'\\''");
    const escapedSubject = subject ? subject.replace(/'/g, "'\\''") : 'Dashboard Message';

    // Send mail using gt mail send
    const command = `gt mail send '${to}' -s '${escapedSubject}' -m '${escapedMessage}'`;

    await execAsync(command, { timeout: 10000 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending mail:', error);
    return NextResponse.json(
      { error: 'Failed to send mail', details: String(error) },
      { status: 500 }
    );
  }
}
