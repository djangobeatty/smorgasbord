/**
 * Types for gt status command output
 */

export interface GtAgent {
  name: string;
  address: string;
  session?: string;
  role: string;
  running: boolean;
  has_work: boolean;
  state?: string;
  unread_mail: number;
  first_subject?: string;
}

export interface GtRig {
  name: string;
  polecats: string[] | null;
  polecat_count: number;
  crews: string[];
  crew_count: number;
  has_witness: boolean;
  has_refinery: boolean;
  agents: GtAgent[];
}

export interface GtStatusOutput {
  name: string;
  agents: GtAgent[];
  rigs?: GtRig[];
}

export type AgentRole = 'mayor' | 'deacon' | 'witness' | 'polecat' | 'crew' | 'unknown';

export interface GtStatusSummary {
  totalAgents: number;
  runningAgents: number;
  agentsWithWork: number;
  totalUnreadMail: number;
  byRole: {
    [key in AgentRole]?: {
      total: number;
      running: number;
      withWork: number;
      unreadMail: number;
    };
  };
}
