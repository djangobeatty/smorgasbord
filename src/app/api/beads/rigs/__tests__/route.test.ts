import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock the beads-reader module
vi.mock('@/lib/beads-reader', () => ({
  getBeadsReader: vi.fn(() => ({
    getIssuesRaw: vi.fn(),
    getRigNames: vi.fn(),
  })),
}));

import { getBeadsReader } from '@/lib/beads-reader';

const mockGetBeadsReader = getBeadsReader as ReturnType<typeof vi.fn>;

describe('GET /api/beads/rigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of rig names', async () => {
    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn(),
      getRigNames: vi.fn().mockResolvedValue(['rig-alpha', 'rig-beta', 'rig-gamma']),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('rigs');
    expect(data.rigs).toEqual(['rig-alpha', 'rig-beta', 'rig-gamma']);
  });

  it('returns empty array when no rigs exist', async () => {
    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn(),
      getRigNames: vi.fn().mockResolvedValue([]),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rigs).toEqual([]);
  });

  it('returns single rig for default configuration', async () => {
    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn(),
      getRigNames: vi.fn().mockResolvedValue(['default']),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rigs).toEqual(['default']);
  });

  it('returns 500 error when reader throws', async () => {
    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn(),
      getRigNames: vi.fn().mockRejectedValue(new Error('Cannot read directory')),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch rigs');
  });
});
