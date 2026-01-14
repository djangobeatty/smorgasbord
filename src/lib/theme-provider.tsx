'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { VisualTheme } from '@/types/config';

interface ThemeContextValue {
  theme: VisualTheme;
  setTheme: (theme: VisualTheme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'smorgasbord-theme';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: VisualTheme;
}

export function ThemeProvider({ children, defaultTheme = 'smorgasbord' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<VisualTheme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme class to document
  const applyTheme = useCallback((newTheme: VisualTheme) => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('theme-hangover', 'theme-smorgasbord');

    // Add new theme class (hangover is default, so we only add class for non-default)
    if (newTheme !== 'hangover') {
      root.classList.add(`theme-${newTheme}`);
    }
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as VisualTheme | null;
      if (stored && (stored === 'hangover' || stored === 'smorgasbord')) {
        setThemeState(stored);
        applyTheme(stored);
      }
    } catch (err) {
      console.error('Failed to load theme from localStorage:', err);
    } finally {
      setIsLoading(false);
    }
  }, [applyTheme]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: VisualTheme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.error('Failed to save theme to localStorage:', err);
    }
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
