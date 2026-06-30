'use client';

/**
 * Modal / overlay primitive.
 *
 * Spec compliance:
 *   - Never snaps open. Backdrop fades in with backdrop-blur-sm; the panel
 *     scales/slides in gently over 250ms (ease-out, no spring).
 *   - AnimatePresence drives the exit animation on close.
 *   - ESC closes, backdrop click closes, body scroll is locked while open, and
 *     focus moves into the panel (and is restored on close).
 *   - prefers-reduced-motion: fade only, no transform.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: Size;
  /** Disable closing via backdrop click / ESC (e.g. while a submit is in flight). */
  dismissible?: boolean;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  dismissible = true,
  children,
}: ModalProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Keep the latest onClose/dismissible without making them effect deps —
  // callers often pass an inline onClose, and re-running the focus/scroll-lock
  // effect on every parent render bounces focus and makes the modal flicker.
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => setMounted(true), []);

  // ESC to close + body scroll lock while open. Runs only when `open` flips.
  useEffect(() => {
    if (!open) return;

    lastFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissibleRef.current) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);

    // Move focus into the panel after it mounts.
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      lastFocused.current?.focus?.();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => dismissible && onClose()}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.98, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.98, y: reduce ? 0 : 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full rounded-xl border border-hairline bg-surface shadow-overlay outline-none',
              SIZES[size],
            )}
          >
            {title !== undefined && (
              <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
                <h2 className="text-base font-semibold text-fg">{title}</h2>
                {dismissible && (
                  <button
                    onClick={onClose}
                    className="rounded-md p-1 text-fg-muted transition hover:bg-surface-hover hover:text-fg"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
