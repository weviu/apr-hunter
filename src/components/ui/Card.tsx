'use client';

/**
 * Card surface primitive.
 *
 * A neutral surface with a hairline border. When `interactive`, hover shifts the
 * background up one step and strengthens the border  restrained, never a scale
 * or lift (per spec). Padding is intentionally not baked in so callers control
 * density; pass it via className.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-hairline bg-surface',
        interactive &&
          'transition hover:bg-surface-hover hover:border-hairline-strong cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
