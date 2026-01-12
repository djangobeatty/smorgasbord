/**
 * Library exports for Gas Town Kanban Dashboard
 */

// Client-side exports
export { BeadsClient, createBeadsClient, getBeadsClient } from './beads-client';
export type { BeadsClientConfig } from './beads-client';

// React hooks (client-side only)
export { useBeads, useIssues, usePolecats, useRigs, useConvoys } from './use-beads';
export type { UseBeadsOptions, UseBeadsResult } from './use-beads';

// Config loader (server-side only)
export {
  loadConfig,
  saveConfig,
  createDefaultConfig,
  validateConfig,
  getActiveProject,
  addProject,
  removeProject,
  setActiveProject,
  getConfigPath,
  getConfigDir,
  detectMode,
  hasGtDirectory,
  hasBeadsDirectory,
} from './config-loader';

// Project mode context and hooks
export {
  ProjectModeProvider,
  useProjectMode,
  useFeature,
  FeatureGate,
  GasTownOnly,
  BeadsOnly,
} from './project-mode';
