/**
 * Beads API Client
 * Fetches and parses data from the beads/bd system for the Gas Town Kanban Dashboard
 */

import type {
  Issue,
  Convoy,
  Polecat,
  Witness,
  Rig,
  Agent,
  BeadsData,
  AgentState,
  RoleType,
  RigState,
  WitnessStatus,
} from '@/types/beads';

export interface BeadsClientConfig {
  beadsPath: string;
  pollingInterval?: number;
  enableCache?: boolean;
  cacheTTL?: number;
}

const DEFAULT_CONFIG: Partial<BeadsClientConfig> = {
  pollingInterval: 5000,
  enableCache: true,
  cacheTTL: 5000,
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface Cache {
  issues?: CacheEntry<Issue[]>;
  convoys?: CacheEntry<Convoy[]>;
  polecats?: CacheEntry<Polecat[]>;
  witnesses?: CacheEntry<Witness[]>;
  rigs?: CacheEntry<Rig[]>;
}

export class BeadsClient {
  private config: BeadsClientConfig;
  private cache: Cache = {};
  private pollingCallbacks: Map<string, (data: BeadsData) => void> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(config: BeadsClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!this.config.enableCache || !entry) return false;
    return Date.now() - entry.timestamp < (this.config.cacheTTL ?? 5000);
  }

  private setCache<T>(key: keyof Cache, data: T): void {
    if (this.config.enableCache) {
      (this.cache[key] as CacheEntry<T>) = {
        data,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Parse a JSONL file content into an array of objects
   */
  private parseJsonl<T>(content: string): T[] {
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T);
  }

  /**
   * Parse agent details from issue description
   */
  private parseAgentFromIssue(issue: Issue): Agent | null {
    if (issue.issue_type !== 'agent') return null;

    const desc = issue.description;
    const getField = (field: string): string | null => {
      const match = desc.match(new RegExp(`${field}:\\s*(.+)`));
      return match ? match[1].trim() : null;
    };

    return {
      id: issue.id,
      title: issue.title,
      role_type: (getField('role_type') as RoleType) ?? 'polecat',
      rig: getField('rig') ?? '',
      agent_state: (getField('agent_state') as AgentState) ?? 'idle',
      hook_bead: issue.hook_bead ?? getField('hook_bead'),
      role_bead: issue.role_bead ?? getField('role_bead'),
      cleanup_status: getField('cleanup_status'),
      active_mr: getField('active_mr'),
      notification_level: getField('notification_level'),
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    };
  }

  /**
   * Parse rig details from issue description
   */
  private parseRigFromIssue(issue: Issue): Rig | null {
    if (!issue.labels?.includes('gt:rig')) return null;

    const desc = issue.description;
    const getField = (field: string): string | null => {
      const match = desc.match(new RegExp(`${field}:\\s*(.+)`));
      return match ? match[1].trim() : null;
    };

    return {
      id: issue.id,
      name: issue.title,
      repo: getField('repo') ?? '',
      prefix: getField('prefix') ?? '',
      state: (getField('state') as RigState) ?? 'active',
    };
  }

  /**
   * Fetch raw issues JSONL content
   * This should be implemented based on the runtime environment
   */
  async fetchIssuesRaw(): Promise<string> {
    // In Next.js server context, this would use fs
    // In client context, this would fetch from an API route
    const response = await fetch(`/api/beads/issues`);
    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }
    return response.text();
  }

  /**
   * Get all issues, optionally filtered by rig
   */
  async getIssues(rig?: string): Promise<Issue[]> {
    if (this.isCacheValid(this.cache.issues)) {
      const issues = this.cache.issues!.data;
      return rig ? issues.filter((i) => this.getIssueRig(i) === rig) : issues;
    }

    const content = await this.fetchIssuesRaw();
    const issues = this.parseJsonl<Issue>(content);
    this.setCache('issues', issues);

    return rig ? issues.filter((i) => this.getIssueRig(i) === rig) : issues;
  }

  /**
   * Extract rig from issue ID prefix or assignee
   */
  private getIssueRig(issue: Issue): string | null {
    if (issue.assignee) {
      const parts = issue.assignee.split('/');
      if (parts.length >= 1) return parts[0];
    }
    return null;
  }

  /**
   * Get all convoys
   */
  async getConvoys(): Promise<Convoy[]> {
    if (this.isCacheValid(this.cache.convoys)) {
      return this.cache.convoys!.data;
    }

    // Convoys are derived from issues with convoy relationships
    // For now, return empty array - implement when convoy data structure is clearer
    const convoys: Convoy[] = [];
    this.setCache('convoys', convoys);
    return convoys;
  }

  /**
   * Get all polecats, optionally filtered by rig
   */
  async getPolecats(rig?: string): Promise<Polecat[]> {
    if (this.isCacheValid(this.cache.polecats)) {
      const polecats = this.cache.polecats!.data;
      return rig ? polecats.filter((p) => p.rig === rig) : polecats;
    }

    const issues = await this.getIssues();
    const polecats: Polecat[] = issues
      .filter((issue) => issue.issue_type === 'agent')
      .map((issue) => this.parseAgentFromIssue(issue))
      .filter((agent): agent is Agent => agent !== null && agent.role_type === 'polecat')
      .map((agent) => ({
        id: agent.id,
        name: agent.title,
        rig: agent.rig,
        status: agent.agent_state,
        hooked_work: agent.hook_bead,
        unread_mail: 0, // Not available from beads, would need gt status
        branch: undefined,
        convoy: undefined,
      }));

    this.setCache('polecats', polecats);
    return rig ? polecats.filter((p) => p.rig === rig) : polecats;
  }

  /**
   * Get all witnesses, optionally filtered by rig
   */
  async getWitnesses(rig?: string): Promise<Witness[]> {
    if (this.isCacheValid(this.cache.witnesses)) {
      const witnesses = this.cache.witnesses!.data;
      return rig ? witnesses.filter((w) => w.rig === rig) : witnesses;
    }

    const issues = await this.getIssues();
    const witnesses: Witness[] = issues
      .filter((issue) => issue.issue_type === 'agent')
      .map((issue) => this.parseAgentFromIssue(issue))
      .filter((agent): agent is Agent => agent !== null && agent.role_type === 'witness')
      .map((agent) => {
        const issue = issues.find((i) => i.id === agent.id);
        const desc = issue?.description ?? '';
        const getField = (field: string): string | null => {
          const match = desc.match(new RegExp(`${field}:\\s*(.+)`));
          return match ? match[1].trim() : null;
        };
        const unreadMailStr = getField('unread_mail');
        const lastCheck = getField('last_check');
        const statusStr = getField('witness_status') ?? agent.agent_state;

        let witnessStatus: WitnessStatus = 'idle';
        if (statusStr === 'active') witnessStatus = 'active';
        else if (statusStr === 'error') witnessStatus = 'error';
        else if (statusStr === 'stopped' || statusStr === 'done') witnessStatus = 'stopped';

        return {
          id: agent.id,
          rig: agent.rig,
          status: witnessStatus,
          last_check: lastCheck ?? agent.updated_at,
          unread_mail: unreadMailStr ? parseInt(unreadMailStr, 10) : 0,
        };
      });

    this.setCache('witnesses', witnesses);
    return rig ? witnesses.filter((w) => w.rig === rig) : witnesses;
  }

  /**
   * Get all rigs
   */
  async getRigs(): Promise<Rig[]> {
    if (this.isCacheValid(this.cache.rigs)) {
      return this.cache.rigs!.data;
    }

    const issues = await this.getIssues();
    const rigs: Rig[] = issues
      .filter((issue) => issue.labels?.includes('gt:rig'))
      .map((issue) => this.parseRigFromIssue(issue))
      .filter((rig): rig is Rig => rig !== null);

    this.setCache('rigs', rigs);
    return rigs;
  }

  /**
   * Get all data at once
   */
  async getAllData(): Promise<BeadsData> {
    const [issues, convoys, polecats, witnesses, rigs] = await Promise.all([
      this.getIssues(),
      this.getConvoys(),
      this.getPolecats(),
      this.getWitnesses(),
      this.getRigs(),
    ]);

    return { issues, convoys, polecats, witnesses, rigs };
  }

  /**
   * Start polling for data updates
   */
  startPolling(callback: (data: BeadsData) => void, id = 'default'): void {
    this.pollingCallbacks.set(id, callback);

    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      try {
        this.invalidateCache();
        const data = await this.getAllData();
        this.pollingCallbacks.forEach((cb) => cb(data));
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, this.config.pollingInterval);

    // Immediately fetch data
    this.getAllData().then((data) => callback(data));
  }

  /**
   * Stop polling for a specific callback
   */
  stopPolling(id = 'default'): void {
    this.pollingCallbacks.delete(id);

    if (this.pollingCallbacks.size === 0 && this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Invalidate all cached data
   */
  invalidateCache(): void {
    this.cache = {};
  }

  /**
   * Manually trigger a refresh
   */
  async refresh(): Promise<BeadsData> {
    this.invalidateCache();
    return this.getAllData();
  }
}

/**
 * Create a beads client instance with default configuration
 */
export function createBeadsClient(beadsPath: string): BeadsClient {
  return new BeadsClient({ beadsPath });
}

/**
 * Singleton instance for use across the application
 */
let defaultClient: BeadsClient | null = null;

export function getBeadsClient(beadsPath?: string): BeadsClient {
  if (!defaultClient) {
    if (!beadsPath) {
      throw new Error('beadsPath required for initial client creation');
    }
    defaultClient = createBeadsClient(beadsPath);
  }
  return defaultClient;
}
