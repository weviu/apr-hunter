import { z } from 'zod';

export const PositionSchema = z.object({
  userId: z.string(),
  platform: z.string().min(1, 'Platform is required'),
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
  entryApr: z.number().min(0, 'APR must be non-negative'),
  currentApr: z.number().min(0).optional(),
  entryPrice: z.number().positive().optional(),
  currentPrice: z.number().positive().optional(),
  status: z.enum(['active', 'closed']).default('active'),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePositionSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().positive('Amount must be positive'),
  entryApr: z.number().min(0, 'APR must be non-negative'),
  entryPrice: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const UpdatePositionSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  currentApr: z.number().min(0).optional(),
  currentPrice: z.number().positive().optional(),
  status: z.enum(['active', 'closed']).optional(),
  notes: z.string().optional(),
});

export type Position = z.infer<typeof PositionSchema>;
export type CreatePosition = z.infer<typeof CreatePositionSchema>;
export type UpdatePosition = z.infer<typeof UpdatePositionSchema>;

export interface PositionDocument extends Position {
  _id: string;
}

