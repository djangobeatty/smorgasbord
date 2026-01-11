'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useProjectMode } from '@/lib/project-mode';
import { NAV_ITEMS } from '@/types/project';

export function NavBar() {
  const pathname = usePathname();
  const { hasFeature, activeProject, isBeadsOnly } = useProjectMode();

  // Filter nav items based on current mode
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.feature) return true;
    return hasFeature(item.feature);
  });

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {activeProject?.name || 'Gas Town Dashboard'}
          </h1>
          {isBeadsOnly && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Beads Only
            </span>
          )}
        </div>
        <nav className="flex items-center gap-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
