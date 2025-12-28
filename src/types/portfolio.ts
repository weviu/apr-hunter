import { ObjectId } from 'mongodb';

export interface Portfolio {
  _id?: ObjectId | string;
  userId: ObjectId | string;
  name: string;
  description?: string;
  type: 'web2' | 'web3'; // Web2 (manual) or Web3 (wallet-connected)
  walletAddress?: string; // For Web3 portfolios
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  _id?: ObjectId | string;
  portfolioId: ObjectId | string;
  userId: ObjectId | string;
  symbol: string;
  asset: string;
  platform: string; // e.g., 'Binance', 'Kraken', 'Aave'
  platformType?: string; // 'exchange' | 'defi'
  chain?: string; // Ethereum, BSC, Polygon, etc.
  amount: number;
  apr?: number;
  riskLevel?: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PositionSnapshot {
  _id?: ObjectId | string;
  positionId: ObjectId | string;
  portfolioId: ObjectId | string;
  userId: ObjectId | string;
  symbol: string;
  amount: number;
  value?: number; // USD value at snapshot time
  apr?: number;
  capturedAt: string;
}

export interface PortfolioStats {
  totalPositions: number;
  totalAmount: number;
  avgApr: number;
  positions: Position[];
}
