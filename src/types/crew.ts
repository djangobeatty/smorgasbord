/**
 * Types for crew workspace data
 */

export type CrewStatus = 'running' | 'stopped' | 'error';

export interface CrewMember {
  id: string;
  name: string;
  rig: string;
  path: string;
  branch: string;
  gitStatus: 'clean' | 'dirty';
  status: CrewStatus;
  mailCount: number;
  lastActivity?: string;
}

export interface CrewMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export interface CrewState {
  members: CrewMember[];
  totalCount: number;
  runningCount: number;
  stoppedCount: number;
}
