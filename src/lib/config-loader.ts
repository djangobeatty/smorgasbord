/**
 * Configuration loader for Mission Control Dashboard
 * Handles loading, validation, auto-creation, and mode detection
 */

import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type {
  DashboardConfig,
  ProjectConfig,
  ConfigResult,
  ConfigValidation,
  ValidationError,
  DashboardMode,
} from '@/types/config';
import { DEFAULT_CONFIG } from '@/types/config';

/**
 * Expand ~ to home directory
 */
function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

/**
 * Get the full config file path
 */
export function getConfigPath(): string {
  return expandPath('~/.mission-control/config.json');
}

/**
 * Get the config directory path
 */
export function getConfigDir(): string {
  return expandPath('~/.mission-control');
}

/**
 * Check if a path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory contains a .gt directory (Gas Town project indicator)
 */
export async function hasGtDirectory(projectPath: string): Promise<boolean> {
  const gtPath = join(expandPath(projectPath), '.gt');
  return pathExists(gtPath);
}

/**
 * Check if a directory contains a .beads directory
 */
export async function hasBeadsDirectory(projectPath: string): Promise<boolean> {
  const beadsPath = join(expandPath(projectPath), '.beads');
  return pathExists(beadsPath);
}

/**
 * Check if a path or its parents contain a .gt directory (Gas Town indicator)
 */
async function findGtDirectory(startPath: string, maxLevels = 5): Promise<string | null> {
  let currentPath = expandPath(startPath);

  for (let i = 0; i < maxLevels; i++) {
    const gtPath = join(currentPath, '.gt');
    if (await pathExists(gtPath)) {
      return currentPath;
    }
    const parentPath = join(currentPath, '..');
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }
  return null;
}

/**
 * Auto-detect dashboard mode based on environment
 * - If GT_RIGS env var is set, use multi-rig mode
 * - If .gt directory exists (Gas Town), detect number of rigs
 * - If multiple projects configured, use multi-project mode
 */
export async function detectMode(config: DashboardConfig): Promise<DashboardMode> {
  // If GT_RIGS environment variable is set, it's multi-rig mode
  if (process.env.GT_RIGS) {
    const rigCount = process.env.GT_RIGS.split(',').filter(r => r.trim()).length;
    if (rigCount > 1) {
      return 'multi';
    }
  }

  // If multiple projects configured, use multi mode
  if (config.projects.length > 1) {
    return 'multi';
  }

  // Check for Gas Town directory at cwd or parent levels
  const cwd = process.cwd();
  const gtBasePath = process.env.GT_BASE_PATH ?? await findGtDirectory(cwd);

  if (gtBasePath) {
    // We're in a Gas Town setup - check for multiple rigs
    try {
      const entries = await fs.readdir(gtBasePath, { withFileTypes: true });
      const rigDirs = entries.filter(e =>
        e.isDirectory() &&
        !e.name.startsWith('.') &&
        e.name !== 'mayor' &&
        e.name !== 'deacon'
      );

      // Check if any of these directories are rigs (have .beads)
      let rigCount = 0;
      for (const dir of rigDirs) {
        const beadsPath = join(gtBasePath, dir.name, '.beads');
        if (await pathExists(beadsPath)) {
          rigCount++;
        }
      }

      if (rigCount > 1) {
        return 'multi';
      }
    } catch {
      // Ignore errors in directory scanning
    }
  }

  // Default based on project count
  return config.projects.length === 1 ? 'single' : 'multi';
}

/**
 * Validate a project configuration
 */
function validateProject(project: ProjectConfig, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `projects[${index}]`;

  if (!project.id || typeof project.id !== 'string') {
    errors.push({ field: `${prefix}.id`, message: 'Project ID is required and must be a string' });
  }

  if (!project.name || typeof project.name !== 'string') {
    errors.push({ field: `${prefix}.name`, message: 'Project name is required and must be a string' });
  }

  if (!project.beadsPath || typeof project.beadsPath !== 'string') {
    errors.push({ field: `${prefix}.beadsPath`, message: 'Beads path is required and must be a string' });
  }

  return errors;
}

/**
 * Validate the entire configuration
 */
export function validateConfig(config: unknown): ConfigValidation {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: [{ field: 'config', message: 'Config must be an object' }] };
  }

  const cfg = config as Record<string, unknown>;

  // Version check
  if (typeof cfg.version !== 'number' || cfg.version < 1) {
    errors.push({ field: 'version', message: 'Version must be a positive number' });
  }

  // Mode check
  if (cfg.mode !== undefined && cfg.mode !== 'single' && cfg.mode !== 'multi') {
    errors.push({ field: 'mode', message: 'Mode must be "single" or "multi"' });
  }

  // Projects check
  if (!Array.isArray(cfg.projects)) {
    errors.push({ field: 'projects', message: 'Projects must be an array' });
  } else {
    cfg.projects.forEach((project, index) => {
      errors.push(...validateProject(project as ProjectConfig, index));
    });

    // Check for duplicate IDs
    const ids = (cfg.projects as ProjectConfig[]).map(p => p.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
      errors.push({ field: 'projects', message: `Duplicate project IDs: ${duplicates.join(', ')}` });
    }
  }

  // Active project check
  if (cfg.activeProject !== undefined && typeof cfg.activeProject !== 'string') {
    errors.push({ field: 'activeProject', message: 'Active project must be a string' });
  }

  // Display preferences validation
  if (cfg.display !== undefined) {
    if (typeof cfg.display !== 'object') {
      errors.push({ field: 'display', message: 'Display must be an object' });
    } else {
      const display = cfg.display as Record<string, unknown>;
      if (display.pollingInterval !== undefined &&
          (typeof display.pollingInterval !== 'number' || display.pollingInterval < 1000)) {
        errors.push({ field: 'display.pollingInterval', message: 'Polling interval must be at least 1000ms' });
      }
      // Theme validation - allow old values for backwards compatibility
      // Theme is handled by theme-provider and stored in localStorage anyway
      if (display.featureMode !== undefined &&
          !['gastown', 'beads-only'].includes(display.featureMode as string)) {
        errors.push({ field: 'display.featureMode', message: 'Feature mode must be "gastown" or "beads-only"' });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create default configuration file
 */
export async function createDefaultConfig(): Promise<ConfigResult<DashboardConfig>> {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  try {
    // Create config directory if needed
    await fs.mkdir(configDir, { recursive: true });

    // Try to auto-detect a project from cwd
    const cwd = process.cwd();
    const config = { ...DEFAULT_CONFIG };

    if (await hasBeadsDirectory(cwd)) {
      const projectName = cwd.split('/').pop() || 'default';
      config.projects = [{
        id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: projectName,
        beadsPath: join(cwd, '.beads'),
        gtPath: await hasGtDirectory(cwd) ? join(cwd, '.gt') : undefined,
        active: true,
      }];
      config.activeProject = config.projects[0].id;
      // mode is deprecated - rigs auto-detected from gt status
    }

    config.updatedAt = new Date().toISOString();

    // Write config file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return { success: true, data: config };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create config: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Load configuration from file
 * Auto-creates default config if missing
 */
export async function loadConfig(): Promise<ConfigResult<DashboardConfig>> {
  const configPath = getConfigPath();

  try {
    // Check if config exists
    if (!(await pathExists(configPath))) {
      // Create default config
      return createDefaultConfig();
    }

    // Read and parse config
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    // Validate config
    const validation = validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid config: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
      };
    }

    // Mode is deprecated - rigs auto-detected from gt status
    // Keep mode field for backwards compatibility but don't compute it
    return { success: true, data: config as DashboardConfig };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON in config file' };
    }
    return {
      success: false,
      error: `Failed to load config: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: DashboardConfig): Promise<ConfigResult<void>> {
  const configPath = getConfigPath();
  const configDir = getConfigDir();

  try {
    // Validate before saving
    const validation = validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid config: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
      };
    }

    // Update timestamp
    config.updatedAt = new Date().toISOString();

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save config: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get active project from config
 */
export function getActiveProject(config: DashboardConfig): ProjectConfig | null {
  if (!config.projects.length) {
    return null;
  }

  // Find by activeProject ID
  if (config.activeProject) {
    const project = config.projects.find(p => p.id === config.activeProject);
    if (project) return project;
  }

  // Find project marked as active
  const activeProject = config.projects.find(p => p.active);
  if (activeProject) return activeProject;

  // Default to first project
  return config.projects[0];
}

/**
 * Add a new project to config
 */
export async function addProject(
  config: DashboardConfig,
  project: ProjectConfig
): Promise<ConfigResult<DashboardConfig>> {
  // Check for duplicate ID
  if (config.projects.some(p => p.id === project.id)) {
    return { success: false, error: `Project with ID "${project.id}" already exists` };
  }

  // Validate project
  const errors = validateProject(project, config.projects.length);
  if (errors.length > 0) {
    return { success: false, error: errors.map(e => e.message).join('; ') };
  }

  // Add project
  const newConfig = {
    ...config,
    projects: [...config.projects, project],
    // mode is deprecated - rigs auto-detected from gt status
  };

  // If this is the first project, make it active
  if (newConfig.projects.length === 1) {
    newConfig.activeProject = project.id;
  }

  return { success: true, data: newConfig };
}

/**
 * Remove a project from config
 */
export function removeProject(
  config: DashboardConfig,
  projectId: string
): ConfigResult<DashboardConfig> {
  const index = config.projects.findIndex(p => p.id === projectId);
  if (index === -1) {
    return { success: false, error: `Project "${projectId}" not found` };
  }

  const newProjects = config.projects.filter(p => p.id !== projectId);
  const newConfig = {
    ...config,
    projects: newProjects,
    // mode is deprecated - rigs auto-detected from gt status
  };

  // Update active project if removed
  if (config.activeProject === projectId) {
    newConfig.activeProject = newProjects[0]?.id;
  }

  return { success: true, data: newConfig };
}

/**
 * Set active project
 */
export function setActiveProject(
  config: DashboardConfig,
  projectId: string
): ConfigResult<DashboardConfig> {
  if (!config.projects.some(p => p.id === projectId)) {
    return { success: false, error: `Project "${projectId}" not found` };
  }

  return {
    success: true,
    data: { ...config, activeProject: projectId },
  };
}
