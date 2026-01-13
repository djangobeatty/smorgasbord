'use client';

import { cn } from '@/lib/utils';
import type { ProjectConfig } from '@/types/config';

interface ProjectCardProps {
  project: ProjectConfig;
  onEdit: (project: ProjectConfig) => void;
  onDelete: (project: ProjectConfig) => void;
  onToggleActive: (project: ProjectConfig) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onToggleActive,
}: ProjectCardProps) {
  const isActive = project.active !== false; // Default to active if undefined
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4 transition-all hover:shadow-sm dark:bg-zinc-900/50',
        isActive
          ? 'border-green-500/50 dark:border-green-500/30'
          : 'border-zinc-200 dark:border-zinc-700'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
              {project.name}
            </h3>
            {isActive && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 font-mono truncate mt-1">
            {project.beadsPath}
          </p>
          {project.prefix && (
            <p className="text-xs text-zinc-400 mt-1">
              Prefix: <span className="font-mono">{project.prefix}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => onEdit(project)}
          className="flex-1 px-2 py-1 text-xs rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onToggleActive(project)}
          className={cn(
            'flex-1 px-2 py-1 text-xs rounded transition-colors',
            isActive
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/50 dark:hover:bg-amber-800/50 dark:text-amber-300'
              : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/50 dark:hover:bg-green-800/50 dark:text-green-300'
          )}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={() => onDelete(project)}
          className="px-2 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-800/50 dark:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
