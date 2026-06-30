/**
 * UI primitives barrel  the "dark Notion" design system.
 *
 * Import from a single place:
 *   import { Button, Modal, Card, FadeRise, Stagger, StaggerItem, Skeleton } from '@/components/ui';
 */
export { cn } from './cn';
export { Button, type ButtonProps } from './Button';
export { Modal, type ModalProps } from './Modal';
export { Card, type CardProps } from './Card';
export { Skeleton, SkeletonText } from './Skeleton';
export {
  FadeRise,
  Stagger,
  StaggerItem,
  EASE_OUT,
  ENTRANCE_DURATION,
  STAGGER_STEP,
} from './motion';
