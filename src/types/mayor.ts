/**
 * TypeScript types for Mayor status and control
 */

export type MayorStatus = 'online' | 'offline' | 'busy';

export interface MayorSessionInfo {
  uptime: string;
  currentTask: string | null;
  contextUsagePercent: number;
  lastActivity: string;
}

export interface MayorState {
  status: MayorStatus;
  session: MayorSessionInfo | null;
}
