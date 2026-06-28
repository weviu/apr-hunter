'use client';

/**
 * Button primitive.
 *
 * Spec compliance:
 *   - Restrained hover: background/border shift only, never scale.
 *   - Transition on color/background/border/shadow/opacity (the `transition`
 *     utility, defaulted to 200ms ease-in-out in tailwind.config.ts).
 *   - Loading "weight": when an async onClick is in flight, the spinner + disabled
 *     state is shown for AT LEAST 400ms so the interface never flickers. Works
 *     both with a controlled `loading` prop and automatically when onClick
 *     returns a promise.
 */

import { Loader2 } from 'lucide-react';
import { forwardRef, useCallback, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const MIN_LOADING_MS = 400;

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover border border-transparent',
  secondary:
    'bg-surface text-fg border border-hairline hover:bg-surface-hover hover:border-hairline-strong',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-hover hover:text-fg border border-transparent',
  danger: 'bg-transparent text-danger border border-transparent hover:bg-danger-soft',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-md',
  lg: 'h-11 px-6 text-base gap-2 rounded-lg',
};

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  /** May return a promise — the loading state is held for ≥400ms while it settles. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    leftIcon,
    onClick,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const [autoLoading, setAutoLoading] = useState(false);
  const inFlight = useRef(false);
  const isLoading = loading || autoLoading;

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick || inFlight.current) return;
      const result = onClick(e);
      // Only engage the loading floor for genuinely async handlers.
      if (result instanceof Promise) {
        inFlight.current = true;
        setAutoLoading(true);
        try {
          await Promise.all([result, delay(MIN_LOADING_MS)]);
        } finally {
          inFlight.current = false;
          setAutoLoading(false);
        }
      }
    },
    [onClick],
  );

  return (
    <button
      ref={ref}
      type={type}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
        'disabled:opacity-50 disabled:pointer-events-none',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        leftIcon
      )}
      <span>{isLoading ? loadingText ?? children : children}</span>
    </button>
  );
});
