/**
 * Library exports for Gas Town Kanban Dashboard
 */

// Client-side exports
export { BeadsClient, createBeadsClient, getBeadsClient } from './beads-client';
export type { BeadsClientConfig } from './beads-client';

// React hooks (client-side only)
export { useBeads, useIssues, usePolecats, useRigs, useConvoys } from './use-beads';
export type { UseBeadsOptions, UseBeadsResult } from './use-beads';
