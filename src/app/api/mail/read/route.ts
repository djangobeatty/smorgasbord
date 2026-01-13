/**
 * API Route: POST /api/mail/read
 * Mark messages as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { messageIds } = await request.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'messageIds array is required' },
        { status: 400 }
      );
    }

    // Mark messages as read using gt mail mark-read (can take multiple ids)
    try {
      const idList = messageIds.join(' ');
      await execGt(`gt mail mark-read ${idList} 2>/dev/null`, {
        timeout: 10000,
      });

      return NextResponse.json({
        success: true,
        markedCount: messageIds.length,
      });
    } catch (err) {
      console.error('gt mail mark-read failed:', err);
      return NextResponse.json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to mark as read',
      });
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark messages as read',
      },
      { status: 500 }
    );
  }
}
