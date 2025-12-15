import { z } from 'zod';

export const AssetSchema = z.object({
  symbol: z.string(), // e.g., "BTC", "ETH"
  name: z.string(), // e.g., "Bitcoin", "Ethereum"
  marketCap: z.number().optional(),
  price: z.number().optional(),
  chains: z.array(z.string()), // Supported chains
  logoUrl: z.string().optional(),
  description: z.string().optional(),
});

export type Asset = z.infer<typeof AssetSchema>;

export interface AssetDocument extends Asset {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
}

