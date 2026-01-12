/**
 * Type exports for Gas Town Kanban Dashboard
 */

export * from './beads';
export * from './config';
export * from './mayor';
// Re-export project types with explicit names to avoid conflict with config.ts
export {
  type ProjectMode,
  type ProjectConfig as MultiProjectConfig,
  type AppSettings,
  type MissionControlConfig,
  type ResolvedMode,
  MODE_FEATURES,
  type NavItem,
  NAV_ITEMS,
} from './project';
