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

// Helper to create a mock Request with URL
function createRequest(url: string): Request {
  return new Request(url);
}

describe('GET /api/beads/issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns raw JSONL content', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({ id: 'gd-001', title: 'Task 1', _rig: 'rig-alpha' }),
      JSON.stringify({ id: 'gd-002', title: 'Task 2', _rig: 'rig-alpha' }),
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn(),
    });

    const request = createRequest('http://localhost:3000/api/beads/issues');
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/x-ndjson');

    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);

    const parsed = lines.map((line) => JSON.parse(line));
    expect(parsed[0].id).toBe('gd-001');
    expect(parsed[1].id).toBe('gd-002');
  });

  it('filters issues by rig query parameter using _rig field', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({ id: 'alpha-001', title: 'Alpha Task', _rig: 'rig-alpha' }),
      JSON.stringify({ id: 'beta-001', title: 'Beta Task', _rig: 'rig-beta' }),
      JSON.stringify({ id: 'alpha-002', title: 'Another Alpha', _rig: 'rig-alpha' }),
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn(),
    });

    const request = createRequest('http://localhost:3000/api/beads/issues?rig=rig-alpha');
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);

    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);

    const parsed = lines.map((line) => JSON.parse(line));
    expect(parsed.every((issue) => issue._rig === 'rig-alpha')).toBe(true);
  });

  it('filters issues by rig query parameter using id prefix', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({ id: 'alpha-001', title: 'Alpha Task' }),
      JSON.stringify({ id: 'beta-001', title: 'Beta Task' }),
      JSON.stringify({ id: 'alpha-002', title: 'Another Alpha' }),
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn(),
    });

    const request = createRequest('http://localhost:3000/api/beads/issues?rig=alpha');
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);

    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);

    const parsed = lines.map((line) => JSON.parse(line));
    expect(parsed.every((issue) => issue.id.startsWith('alpha-'))).toBe(true);
  });

  it('returns empty content when no issues match filter', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({ id: 'alpha-001', title: 'Alpha Task', _rig: 'rig-alpha' }),
      JSON.stringify({ id: 'beta-001', title: 'Beta Task', _rig: 'rig-beta' }),
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn(),
    });

    const request = createRequest('http://localhost:3000/api/beads/issues?rig=rig-gamma');
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('');
  });

  it('returns empty when no issues exist', async () => {
    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(''),
      getRigNames: vi.fn(),
    });

    const request = createRequest('http://localhost:3000/api/beads/issues');
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('');
  });

  it('skips malformed JSON lines during filtering', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({ id: 'alpha-001', title: 'Alpha Task', _rig: 'rig-alpha' }),
      'invalid json',
      JSON.stringify({ id: 'alpha-002', title: 'Another Alpha', _rig: 'rig-alpha' }),
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn(),
    });

    const request = createRequest('http://localhost:3000/api/beads/issues?rig=rig-alpha');
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);

    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it('returns 500 error when reader throws', async () => {
    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockRejectedValue(new Error('File not found')),
      getRigNames: vi.fn(),
    });

    const request = createRequest('http://localhost:3000/api/beads/issues');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch issues');
  });

  it('handles whitespace-only lines gracefully', async () => {
    const mockIssuesJsonl = [
      JSON.stringify({ id: 'gd-001', title: 'Task 1' }),
      '   ',
      '',
      JSON.stringify({ id: 'gd-002', title: 'Task 2' }),
    ].join('\n');

    mockGetBeadsReader.mockReturnValue({
      getIssuesRaw: vi.fn().mockResolvedValue(mockIssuesJsonl),
      getRigNames: vi.fn(),
    });

    const request = createRequest('http://localhost:3000/api/beads/issues');
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    // The raw content is returned as-is when no filter is applied
    expect(text).toBe(mockIssuesJsonl);
  });
});
