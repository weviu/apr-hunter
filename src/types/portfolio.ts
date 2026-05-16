// Serialised API response types (dates as ISO strings, ids as strings).
// MongoDB ObjectId/Date fields are converted by the service layer.

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;    // null = active; set = soft-deleted
}

export interface Position {
  id: string;
  portfolioId: string;
  userId: string;
  asset: string;               // e.g. 'USDT'
  exchange: string;            // e.g. 'binance'
  protocol: string | null;     // e.g. 'aave' for DeFi
  chainId: number | null;
  walletAddress: string | null;
  amount: number;
  aprAtEntry: number;          // decimal at time of entry
  stakedAt: string;            // ISO 8601
  closedAt: string | null;
  notes: string | null;
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
