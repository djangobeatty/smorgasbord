/**
 * Configuration schema types for Mission Control Dashboard
 * Supports multi-project configuration with mode auto-detection
 */

export type DashboardMode = 'single' | 'multi';

/**
 * Configuration for a single project/rig
 */
export interface ProjectConfig {
  /** Unique identifier for the project */
  id: string;
  /** Display name for the project */
  name: string;
  /** Path to the .beads directory for this project */
  beadsPath: string;
  /** Optional path to the .gt directory (for mode detection) */
  gtPath?: string;
  /** Optional GitHub repository URL */
  repo?: string;
  /** Optional prefix used for issue IDs */
  prefix?: string;
  /** Whether this is the active project */
  active?: boolean;
}

/**
 * Dashboard display preferences
 */
export interface DisplayPreferences {
  /** Default view on load: kanban, polecats, convoys, etc. */
  defaultView?: string;
  /** Polling interval in milliseconds */
  pollingInterval?: number;
  /** Enable/disable auto-refresh */
  autoRefresh?: boolean;
  /** Theme preference */
  theme?: 'light' | 'dark' | 'system';
  /** Collapsed sections in UI */
  collapsedSections?: string[];
}

/**
 * Main configuration schema
 */
export interface DashboardConfig {
  /** Schema version for migration support */
  version: number;
  /** Dashboard mode: single project or multi-project */
  mode: DashboardMode;
  /** List of configured projects */
  projects: ProjectConfig[];
  /** Currently active project ID */
  activeProject?: string;
  /** Display preferences */
  display?: DisplayPreferences;
  /** Last updated timestamp */
  updatedAt?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: DashboardConfig = {
  version: 1,
  mode: 'single',
  projects: [],
  display: {
    defaultView: 'kanban',
    pollingInterval: 5000,
    autoRefresh: true,
    theme: 'system',
  },
};

/**
 * Configuration file location
 */
export const CONFIG_PATH = '~/.mission-control/config.json';
export const CONFIG_DIR = '~/.mission-control';

/**
 * Result type for config operations
 */
export interface ConfigResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Config validation result
 */
export interface ConfigValidation {
  valid: boolean;
  errors: ValidationError[];
}
