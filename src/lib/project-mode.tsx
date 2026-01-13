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

  const FEATURE_MODE_KEY = 'smorgasbord-feature-mode';

  // Load feature mode from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FEATURE_MODE_KEY);
      if (stored === 'gastown' || stored === 'beads-only') {
        setDetectedMode(stored);
      } else {
        setDetectedMode('gastown');
      }
    } catch (err) {
      console.error('Failed to load feature mode from localStorage:', err);
      setDetectedMode('gastown');
    } finally {
      setIsLoading(false);
    }
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
