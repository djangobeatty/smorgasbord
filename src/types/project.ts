/**
 * Project configuration types for multi-project support
 * Supports gastown (full features) and beads-only (kanban only) modes
 */

export type ProjectMode = 'gastown' | 'beads-only' | 'auto';

export interface ProjectConfig {
  name: string;
  path: string;
  mode: ProjectMode;
  default?: boolean;
}

export interface AppSettings {
  refreshInterval: number;
  theme: 'light' | 'dark' | 'system';
}

export interface MissionControlConfig {
  projects: ProjectConfig[];
  settings: AppSettings;
  activeProject?: string;
}

/**
 * Resolved mode after auto-detection
 */
export type ResolvedMode = 'gastown' | 'beads-only';

/**
 * Features available in each mode
 */
export const MODE_FEATURES: Record<ResolvedMode, {
  polecats: boolean;
  witnesses: boolean;
  refineries: boolean;
  convoys: boolean;
  controlPlane: boolean;
  deacon: boolean;
  mayor: boolean;
  chat: boolean;
  crew: boolean;
  kanban: boolean;
  settings: boolean;
}> = {
  gastown: {
    polecats: true,
    witnesses: true,
    refineries: true,
    convoys: true,
    controlPlane: true,
    deacon: true,
    mayor: true,
    chat: true,
    crew: true,
    kanban: true,
    settings: true,
  },
  'beads-only': {
    polecats: false,
    witnesses: false,
    refineries: false,
    convoys: false,
    controlPlane: false,
    deacon: false,
    mayor: false,
    chat: false,
    crew: false,
    kanban: true,
    settings: true,
  },
};

/**
 * Navigation items with mode requirements
 */
export interface NavItem {
  href: string;
  label: string;
  requiresMode?: ResolvedMode;
  feature?: keyof typeof MODE_FEATURES['gastown'];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/polecats', label: 'Polecats', feature: 'polecats' },
  { href: '/convoys', label: 'Convoys', feature: 'convoys' },
  { href: '/witnesses', label: 'Witnesses', feature: 'witnesses' },
  { href: '/crew', label: 'Crew', feature: 'crew' },
  { href: '/control-plane', label: 'Control Plane', feature: 'controlPlane' },
  { href: '/settings', label: 'Settings' },
];
