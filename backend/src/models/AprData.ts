import { z } from 'zod';

export const AprDataSchema = z.object({
  asset: z.string(), // e.g., "BTC", "ETH"
  platform: z.string(), // e.g., "Binance", "Compound", "Aave"
  platformType: z.enum(['exchange', 'defi']),
  chain: z.string(), // e.g., "ethereum", "bsc", "polygon", "solana"
  apr: z.number().min(0).max(1000), // APR percentage
  apy: z.number().min(0).max(1000).optional(), // APY percentage if available
  minStake: z.number().optional(), // Minimum stake amount
  lockPeriod: z.string().optional(), // e.g., "30 days", "flexible"
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  lastUpdated: z.date(),
  source: z.string(), // API source identifier
});

export type AprData = z.infer<typeof AprDataSchema>;

export interface AprDataDocument extends Omit<AprData, 'lastUpdated'> {
  _id?: string;
  lastUpdated: Date;
  createdAt: Date;
}

