'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  ProjectConfig,
  ResolvedMode,
  MissionControlConfig,
  AppSettings,
} from '@/types/project';
import { MODE_FEATURES } from '@/types/project';

interface ProjectModeContextValue {
  mode: ResolvedMode;
  activeProject: ProjectConfig | null;
  projects: ProjectConfig[];
  settings: AppSettings;
  isLoading: boolean;
  error: Error | null;
  features: typeof MODE_FEATURES['gastown'];
  setActiveProject: (name: string) => void;
  hasFeature: (feature: keyof typeof MODE_FEATURES['gastown']) => boolean;
  isGasTown: boolean;
  isBeadsOnly: boolean;
}

const defaultSettings: AppSettings = {
  refreshInterval: 5000,
  theme: 'system',
};

const defaultContext: ProjectModeContextValue = {
  mode: 'gastown',
  activeProject: null,
  projects: [],
  settings: defaultSettings,
  isLoading: true,
  error: null,
  features: MODE_FEATURES['gastown'],
  setActiveProject: () => {},
  hasFeature: () => true,
  isGasTown: true,
  isBeadsOnly: false,
};

const ProjectModeContext = createContext<ProjectModeContextValue>(defaultContext);

interface ProjectModeProviderProps {
  children: ReactNode;
  initialMode?: ResolvedMode;
}

export function ProjectModeProvider({
  children,
  initialMode,
}: ProjectModeProviderProps) {
  const [config, setConfig] = useState<MissionControlConfig | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [detectedMode, setDetectedMode] = useState<ResolvedMode | null>(null);

  // Load config from API
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          // Set active project from config or use default
          const defaultProject = data.projects?.find((p: ProjectConfig) => p.default);
          setActiveProjectName(data.activeProject || defaultProject?.name || null);
        } else if (response.status === 404) {
          // No config file - auto-detect mode
          await detectMode();
        } else {
          throw new Error('Failed to load config');
        }
      } catch (err) {
        // Config not available - auto-detect mode
        await detectMode();
      } finally {
        setIsLoading(false);
      }
    }

    async function detectMode() {
      try {
        // Check if gt commands are available by calling an API that uses them
        const response = await fetch('/api/beads?detectMode=true');
        if (response.ok) {
          const data = await response.json();
          // If we get gastown-specific data (polecats, witnesses), we're in gastown mode
          const hasGasTownFeatures =
            (data.polecats && data.polecats.length > 0) ||
            (data.witnesses && data.witnesses.length > 0);
          setDetectedMode(hasGasTownFeatures ? 'gastown' : 'beads-only');
        } else {
          setDetectedMode('beads-only');
        }
      } catch {
        // If detection fails, default to gastown for backwards compatibility
        setDetectedMode('gastown');
      }
    }

    loadConfig();
  }, []);

  // Resolve the active project
  const activeProject = config?.projects?.find(
    (p) => p.name === activeProjectName
  ) || null;

  // Resolve the mode
  const resolveMode = useCallback((): ResolvedMode => {
    if (initialMode) return initialMode;
    if (activeProject) {
      if (activeProject.mode === 'auto') {
        return detectedMode || 'gastown';
      }
      return activeProject.mode as ResolvedMode;
    }
    return detectedMode || 'gastown';
  }, [initialMode, activeProject, detectedMode]);

  const mode = resolveMode();
  const features = MODE_FEATURES[mode];

  const hasFeature = useCallback(
    (feature: keyof typeof MODE_FEATURES['gastown']): boolean => {
      return features[feature];
    },
    [features]
  );

  const setActiveProject = useCallback((name: string) => {
    setActiveProjectName(name);
    // Persist selection
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProject', name);
    }
  }, []);

  const value: ProjectModeContextValue = {
    mode,
    activeProject,
    projects: config?.projects || [],
    settings: config?.settings || defaultSettings,
    isLoading,
    error,
    features,
    setActiveProject,
    hasFeature,
    isGasTown: mode === 'gastown',
    isBeadsOnly: mode === 'beads-only',
  };

  return (
    <ProjectModeContext.Provider value={value}>
      {children}
    </ProjectModeContext.Provider>
  );
}

export function useProjectMode() {
  const context = useContext(ProjectModeContext);
  if (!context) {
    throw new Error('useProjectMode must be used within a ProjectModeProvider');
  }
  return context;
}

/**
 * Hook to check if a specific feature is available
 */
export function useFeature(feature: keyof typeof MODE_FEATURES['gastown']): boolean {
  const { hasFeature } = useProjectMode();
  return hasFeature(feature);
}

/**
 * Component that only renders children if the feature is available
 */
interface FeatureGateProps {
  feature: keyof typeof MODE_FEATURES['gastown'];
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const hasFeature = useFeature(feature);
  return hasFeature ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that only renders in gastown mode
 */
interface GasTownOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function GasTownOnly({ children, fallback = null }: GasTownOnlyProps) {
  const { isGasTown } = useProjectMode();
  return isGasTown ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that only renders in beads-only mode
 */
interface BeadsOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function BeadsOnly({ children, fallback = null }: BeadsOnlyProps) {
  const { isBeadsOnly } = useProjectMode();
  return isBeadsOnly ? <>{children}</> : <>{fallback}</>;
}
