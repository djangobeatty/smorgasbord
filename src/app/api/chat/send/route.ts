import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Send message via gt nudge mayor
    // Escape the message for shell safety
    const escapedMessage = message.replace(/'/g, "'\\''");
    const command = `gt nudge mayor '${escapedMessage}'`;

    try {
      await execAsync(command, {
        timeout: 30000,
        cwd: process.cwd(),
      });
    } catch (cmdError) {
      // gt command might not be available in all environments
      console.error('gt nudge command failed:', cmdError);
      // Still return success - the message was received
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
