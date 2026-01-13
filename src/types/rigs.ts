/**
 * Types for Gas Town rig management
 */

export interface RigConfig {
  git_url: string;
  added_at: string;
  beads: {
    repo: string;
    prefix: string;
  };
}

export interface RigStatus {
  name: string;
  gitUrl: string;
  prefix: string;
  addedAt: string;
  polecatCount: number;
  crewCount: number;
  agents: string[];
  /** Whether the rig is currently running (witness/refinery active) */
  running: boolean;
  /** Whether the rig is parked (daemon won't auto-restart) */
  parked: boolean;
  /** Whether the rig is docked (global persistent shutdown) */
  docked: boolean;
}

export interface RigsRegistry {
  version: number;
  rigs: Record<string, RigConfig>;
}
