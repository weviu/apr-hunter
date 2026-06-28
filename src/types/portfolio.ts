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
  product: string | null;      // APR product key, e.g. 'Flexible Savings' — join key into apr_snapshots
  protocol: string | null;     // e.g. 'aave' for DeFi
  chainId: number | null;
  walletAddress: string | null;
  amount: number;
  aprAtEntry: number;          // decimal — live rate captured at entry (fallback for display)
  stakedAt: string;            // ISO 8601
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A Position joined to its current live APR from apr_snapshots (read-time enrichment). */
export interface EnrichedPosition extends Position {
  currentApr: number | null;   // latest APR for (exchange, asset, product); null if no snapshot
  aprSyncedAt: string | null;  // freshness of currentApr
}

export interface PositionSnapshot {
  id: string;
  positionId: string;
  apr: number;
  value: number | null;
  recordedAt: string;
}

export interface PortfolioStats {
  totalPositions: number;
  totalAmount: number;
  avgApr: number;
  positions: Position[];
}
