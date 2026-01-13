'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardConfig, ProjectConfig } from '@/types/config';
import { DEFAULT_CONFIG } from '@/types/config';

export interface UseConfigResult {
  config: DashboardConfig;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  saveConfig: (config: DashboardConfig) => Promise<void>;
  addProject: (project: Omit<ProjectConfig, 'id'>) => Promise<void>;
  updateProject: (project: ProjectConfig) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  /** @deprecated Use toggleRigActive instead */
  setActiveProject: (projectId: string) => Promise<void>;
  toggleRigActive: (projectId: string) => Promise<void>;
  setGtBasePath: (path: string) => Promise<void>;
}

function generateId(): string {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }
      const data = await response.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveConfigToServer = useCallback(async (newConfig: DashboardConfig) => {
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save config');
      }
      setConfig(newConfig);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, []);

  const addProject = useCallback(async (project: Omit<ProjectConfig, 'id'>) => {
    const newProject: ProjectConfig = {
      ...project,
      id: generateId(),
      active: true, // New rigs are active by default
    };
    const newConfig: DashboardConfig = {
      ...config,
      projects: [...config.projects, newProject],
    };
    await saveConfigToServer(newConfig);
  }, [config, saveConfigToServer]);

  const updateProject = useCallback(async (project: ProjectConfig) => {
    const newConfig: DashboardConfig = {
      ...config,
      projects: config.projects.map((p) =>
        p.id === project.id ? project : p
      ),
    };
    await saveConfigToServer(newConfig);
  }, [config, saveConfigToServer]);

  const deleteProject = useCallback(async (projectId: string) => {
    const newProjects = config.projects.filter((p) => p.id !== projectId);
    const newConfig: DashboardConfig = {
      ...config,
      projects: newProjects,
      // mode is deprecated - rigs auto-detected from gt status
    };
    // Update active project if deleted
    if (config.activeProject === projectId) {
      newConfig.activeProject = newProjects[0]?.id;
    }
    await saveConfigToServer(newConfig);
  }, [config, saveConfigToServer]);

  const setActiveProject = useCallback(async (projectId: string) => {
    const newConfig: DashboardConfig = {
      ...config,
      activeProject: projectId,
    };
    await saveConfigToServer(newConfig);
  }, [config, saveConfigToServer]);

  const toggleRigActive = useCallback(async (projectId: string) => {
    const newConfig: DashboardConfig = {
      ...config,
      projects: config.projects.map((p) =>
        p.id === projectId ? { ...p, active: !p.active } : p
      ),
    };
    await saveConfigToServer(newConfig);
  }, [config, saveConfigToServer]);

  const setGtBasePath = useCallback(async (path: string) => {
    const newConfig: DashboardConfig = {
      ...config,
      gtBasePath: path || undefined,
    };
    await saveConfigToServer(newConfig);
  }, [config, saveConfigToServer]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    isLoading,
    error,
    refresh: fetchConfig,
    saveConfig: saveConfigToServer,
    addProject,
    updateProject,
    deleteProject,
    setActiveProject,
    toggleRigActive,
    setGtBasePath,
  };
}
