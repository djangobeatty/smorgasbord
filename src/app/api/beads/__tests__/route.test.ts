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

describe('GET /api/beads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns aggregated beads data with issues, rigs, polecats, and convoys', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({
        id: 'gd-001',
        title: 'Test Task',
        description: 'A test task',
        status: 'open',
        priority: 1,
        issue_type: 'task',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test',
        updated_at: '2024-01-01T00:00:00Z',
      }),
      JSON.stringify({
        id: 'rig-001',
        title: 'Test Rig',
        description: 'repo: test-repo\nprefix: tr\nstate: active',
        status: 'open',
        priority: 0,
        issue_type: 'task',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test',
        updated_at: '2024-01-01T00:00:00Z',
        labels: ['gt:rig'],
      }),
      JSON.stringify({
        id: 'agent-001',
        title: 'morsov',
        description: 'role_type: polecat\nrig: test-rig\nagent_state: active\nhook_bead: gd-001\nrole_bead: null',
        status: 'open',
        priority: 0,
        issue_type: 'agent',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test',
        updated_at: '2024-01-01T00:00:00Z',
      }),
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn().mockResolvedValue(['default']),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('issues');
    expect(data).toHaveProperty('rigs');
    expect(data).toHaveProperty('polecats');
    expect(data).toHaveProperty('convoys');
    expect(data).toHaveProperty('timestamp');

    // Check issues (should exclude agent and rig issues)
    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].id).toBe('gd-001');

    // Check rigs
    expect(data.rigs).toHaveLength(1);
    expect(data.rigs[0].name).toBe('Test Rig');
    expect(data.rigs[0].repo).toBe('test-repo');

    // Check polecats
    expect(data.polecats).toHaveLength(1);
    expect(data.polecats[0].name).toBe('morsov');
    expect(data.polecats[0].status).toBe('active');
    expect(data.polecats[0].hooked_work).toBe('gd-001');

    // Convoys should be empty (not implemented yet)
    expect(data.convoys).toEqual([]);
  });

  it('returns empty arrays when no issues exist', async () => {
    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(''),
      getRigNames: vi.fn().mockResolvedValue([]),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.issues).toEqual([]);
    expect(data.rigs).toEqual([]);
    expect(data.polecats).toEqual([]);
    expect(data.convoys).toEqual([]);
  });

  it('handles malformed JSONL lines gracefully', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({
        id: 'gd-001',
        title: 'Valid Task',
        description: 'A valid task',
        status: 'open',
        priority: 1,
        issue_type: 'task',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test',
        updated_at: '2024-01-01T00:00:00Z',
      }),
      'invalid json line',
      '{ broken json',
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn().mockResolvedValue(['default']),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].id).toBe('gd-001');
  });

  it('returns 500 error when reader throws', async () => {
    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockRejectedValue(new Error('File not found')),
      getRigNames: vi.fn().mockResolvedValue([]),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch beads data');
  });

  it('correctly parses agent state from description', async () => {
    const mockIssuesJsonl = JSON.stringify({
      id: 'agent-002',
      title: 'idle-polecat',
      description: 'role_type: polecat\nrig: main-rig\nagent_state: idle\nhook_bead: null\nrole_bead: role-123',
      status: 'open',
      priority: 0,
      issue_type: 'agent',
      created_at: '2024-01-01T00:00:00Z',
      created_by: 'test',
      updated_at: '2024-01-01T00:00:00Z',
    });

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn().mockResolvedValue(['default']),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.polecats).toHaveLength(1);
    expect(data.polecats[0].status).toBe('idle');
    expect(data.polecats[0].hooked_work).toBeNull();
  });

  it('filters out non-polecat agents', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({
        id: 'agent-001',
        title: 'polecat-agent',
        description: 'role_type: polecat\nrig: test-rig\nagent_state: active',
        status: 'open',
        priority: 0,
        issue_type: 'agent',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test',
        updated_at: '2024-01-01T00:00:00Z',
      }),
      JSON.stringify({
        id: 'agent-002',
        title: 'refinery-agent',
        description: 'role_type: refinery\nrig: test-rig\nagent_state: active',
        status: 'open',
        priority: 0,
        issue_type: 'agent',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test',
        updated_at: '2024-01-01T00:00:00Z',
      }),
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn().mockResolvedValue(['default']),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.polecats).toHaveLength(1);
    expect(data.polecats[0].name).toBe('polecat-agent');
  });
});
