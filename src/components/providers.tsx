'use client';

import { ProjectModeProvider } from '@/lib/project-mode';
import { ThemeProvider } from '@/lib/theme-provider';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <ProjectModeProvider>{children}</ProjectModeProvider>
    </ThemeProvider>
  );
}
