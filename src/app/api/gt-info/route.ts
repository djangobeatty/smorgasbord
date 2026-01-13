/**
 * API Route: /api/gt-info
 * GET - Returns information about the Gas Town configuration
 * PUT - Updates GT_BASE_PATH in .env.local
 */

import { NextRequest, NextResponse } from 'next/server';
import { getResolvedGtRoot } from '@/lib/exec-gt';
import { promises as fs } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const ENV_LOCAL_PATH = join(process.cwd(), '.env.local');

export async function GET() {
  try {
    const gtRoot = getResolvedGtRoot();

    return NextResponse.json({
      gtRoot,
      source: gtRoot ? 'GT_BASE_PATH' : 'not configured',
      envVar: process.env.GT_BASE_PATH || null,
      configured: gtRoot !== null,
    });
  } catch (error) {
    console.error('Error getting GT info:', error);
    return NextResponse.json(
      { error: 'Failed to get GT info' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { gtBasePath } = await request.json();

    if (typeof gtBasePath !== 'string') {
      return NextResponse.json(
        { error: 'gtBasePath must be a string' },
        { status: 400 }
      );
    }

    // Read existing .env.local or start fresh
    let envContent = '';
    try {
      envContent = await fs.readFile(ENV_LOCAL_PATH, 'utf-8');
    } catch {
      // File doesn't exist, start fresh
    }

    // Parse existing env vars
    const lines = envContent.split('\n');
    const envVars: Record<string, string> = {};
    const comments: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed === '') {
        comments.push(line);
      } else {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          envVars[match[1]] = match[2];
        }
      }
    }

    // Update GT_BASE_PATH
    if (gtBasePath.trim()) {
      envVars['GT_BASE_PATH'] = gtBasePath.trim();
    } else {
      delete envVars['GT_BASE_PATH'];
    }

    // Rebuild .env.local content
    const newLines: string[] = [];

    // Add header comment if file was empty
    if (comments.length === 0) {
      newLines.push('# Gas Town Dashboard Configuration');
      newLines.push('');
    }

    // Add env vars
    for (const [key, value] of Object.entries(envVars)) {
      newLines.push(`${key}=${value}`);
    }

    // Write back
    await fs.writeFile(ENV_LOCAL_PATH, newLines.join('\n') + '\n', 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Updated .env.local. Restart the server for changes to take effect.',
      restartRequired: true,
    });
  } catch (error) {
    console.error('Error updating GT info:', error);
    return NextResponse.json(
      { error: 'Failed to update .env.local' },
      { status: 500 }
    );
  }
}
