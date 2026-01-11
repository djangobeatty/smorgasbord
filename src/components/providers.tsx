'use client';

import { ProjectModeProvider } from '@/lib/project-mode';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <ProjectModeProvider>{children}</ProjectModeProvider>;
}
