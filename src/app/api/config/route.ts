/**
 * API Route: /api/config
 * GET - Load dashboard configuration
 * PUT - Save dashboard configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadConfig, saveConfig } from '@/lib/config-loader';
import type { DashboardConfig } from '@/types/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await loadConfig();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error loading config:', error);
    return NextResponse.json(
      { error: 'Failed to load config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const config = body as DashboardConfig;

    const result = await saveConfig(config);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
