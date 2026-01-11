/**
 * TypeScript types for beads data structures
 * Used by the Gas Town Kanban Dashboard to represent work items
 */

export type IssueStatus = 'open' | 'hooked' | 'in_progress' | 'blocked' | 'closed';

export type IssueType = 'task' | 'feature' | 'bug' | 'molecule' | 'agent';

export type Priority = 0 | 1 | 2 | 3 | 4;

export type DependencyType = 'blocks' | 'relates_to';

export interface Dependency {
  issue_id: string;
  depends_on_id: string;
  type: DependencyType;
  created_at: string;
  created_by: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: Priority;
  issue_type: IssueType;
  created_at: string;
  created_by: string;
  updated_at: string;
  assignee?: string;
  dependencies?: Dependency[];
  labels?: string[];
  hook_bead?: string;
  role_bead?: string;
}

export type AgentState = 'spawning' | 'active' | 'idle' | 'done' | 'error';

export type RoleType = 'polecat' | 'refinery' | 'witness';

export interface Agent {
  id: string;
  title: string;
  role_type: RoleType;
  rig: string;
  agent_state: AgentState;
  hook_bead: string | null;
  role_bead: string | null;
  cleanup_status: string | null;
  active_mr: string | null;
  notification_level: string | null;
  created_at: string;
  updated_at: string;
}

export type RigState = 'active' | 'inactive' | 'archived';

export interface Rig {
  id: string;
  name: string;
  repo: string;
  prefix: string;
  state: RigState;
}

export interface Convoy {
  id: string;
  title: string;
  issues: string[];
  status: 'active' | 'completed' | 'stalled';
  progress: {
    completed: number;
    total: number;
  };
  assignee?: string;
  created_at: string;
  updated_at: string;
}

export interface Polecat {
  id: string;
  name: string;
  rig: string;
  status: AgentState;
  hooked_work: string | null;
  session_start?: string;
  last_activity?: string;
  branch?: string;
  convoy?: string;
}

export interface BeadsData {
  issues: Issue[];
  convoys: Convoy[];
  polecats: Polecat[];
  rigs: Rig[];
}
