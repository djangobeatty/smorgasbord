'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  completed: number;
  total: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  completed,
  total,
  className,
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full rounded-full bg-gray-800 overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', {
            'bg-green-500': percentage === 100,
            'bg-blue-500': percentage > 0 && percentage < 100,
            'bg-gray-600': percentage === 0,
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>
            {completed}/{total} issues
          </span>
          <span>{percentage}%</span>
        </div>
      )}
    </div>
  );
}
