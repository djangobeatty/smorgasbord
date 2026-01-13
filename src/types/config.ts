/**
 * Configuration schema types for Mission Control Dashboard
 * Rigs are auto-detected from gt status - no manual config needed
 */

/**
 * @deprecated Mode is auto-detected from gt status. This type exists for backwards compatibility.
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
 * Available visual themes
 */
export type VisualTheme = 'corporate' | 'smorgasbord';

/**
 * Feature mode: gastown (full features) or beads-only (kanban only)
 */
export type FeatureMode = 'gastown' | 'beads-only';

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
  /** Visual theme preference */
  theme?: VisualTheme;
  /** Feature mode: gastown (full) or beads-only (kanban only) */
  featureMode?: FeatureMode;
  /** Collapsed sections in UI */
  collapsedSections?: string[];
}

/**
 * Main configuration schema
 */
export interface DashboardConfig {
  /** Schema version for migration support */
  version: number;
  /**
   * @deprecated Mode is auto-detected from gt status. Kept for backwards compatibility.
   * Dashboard always shows all detected rigs.
   */
  mode?: DashboardMode;
  /** Path to the Gas Town root directory (contains .gt folder) */
  gtBasePath?: string;
  /** Additional directories to prepend to PATH when executing gt/bd commands */
  binPaths?: string[];
  /** List of configured projects (optional - rigs auto-detected from gt status) */
  projects: ProjectConfig[];
  /** Currently active project ID (for filtering, not data source selection) */
  activeProject?: string;
  /** Display preferences */
  display?: DisplayPreferences;
  /** Last updated timestamp */
  updatedAt?: string;
}

/**
 * Default configuration values
 * Note: Rigs are auto-detected from gt status, projects array is optional
 */
export const DEFAULT_CONFIG: DashboardConfig = {
  version: 1,
  // mode is deprecated - rigs auto-detected
  projects: [],
  display: {
    defaultView: 'kanban',
    pollingInterval: 5000,
    autoRefresh: true,
    theme: 'corporate',
    featureMode: 'gastown',
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
