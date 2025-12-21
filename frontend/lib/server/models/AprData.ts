import { z } from 'zod';

export const AprDataSchema = z.object({
  asset: z.string(),
  platform: z.string(),
  platformType: z.enum(['exchange', 'defi']),
  chain: z.string(),
  apr: z.number().min(0).max(1000),
  apy: z.number().min(0).max(1000).optional(),
  minStake: z.number().optional(),
  lockPeriod: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  lastUpdated: z.date(),
  source: z.string(),
});

export type AprData = z.infer<typeof AprDataSchema>;

export interface AprDataDocument extends Omit<AprData, 'lastUpdated'> {
  _id?: string;
  lastUpdated: Date;
  createdAt: Date;
}

