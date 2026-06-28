'use client';

/**
 * Skeleton placeholder.
 *
 * Used to preserve a container's dimensions while data loads so there is no
 * abrupt layout shift. Gentle pulse only (CSS animate-pulse; auto-disabled
 * under prefers-reduced-motion by the global rule in globals.css).
 */

import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-surface-hover', className)}
    />
  );
}

/** Convenience: a block of stacked skeleton lines (e.g. a loading list row). */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}
