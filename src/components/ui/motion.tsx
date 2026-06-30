'use client';

/**
 * Entrance motion primitives (Framer Motion).
 *
 * Per the design spec:
 *   - Blocks fade in and rise: opacity 0→1, translateY 12px→0, 300ms ease-out.
 *   - Lists stagger their children by 40ms.
 *   - No bouncy springs  standard cubic-bezier ease-out only.
 *   - prefers-reduced-motion: drop the translate (and effectively the delay),
 *     keeping a near-instant fade so nothing moves.
 */

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

// Smooth ease-out curve (matches Tailwind's `ease-out-soft`). Not bouncy.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const ENTRANCE_DURATION = 0.3; // 300ms
export const STAGGER_STEP = 0.04; // 40ms

/**
 * Fades a block in and rises it 12px. Use for sections / cards that appear on
 * load. `delay` lets callers offset standalone blocks; for lists prefer
 * <Stagger> + <StaggerItem> instead.
 */
export function FadeRise({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.01 : ENTRANCE_DURATION, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container that staggers the entrance of its <StaggerItem> children by 40ms.
 * Animates once when it enters the viewport.
 */
export function Stagger({
  children,
  className,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
}) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: STAGGER_STEP } },
  };
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-40px' }}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered child. Must be rendered inside <Stagger>. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0.01 : ENTRANCE_DURATION, ease: EASE_OUT },
    },
  };
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
