// ─── V2 DB schema types (serialised form — dates as ISO strings, _id as string) ─

/**
 * A single APR rate row written by the sync job.
 * `apr` is stored as a decimal: 0.052 = 5.2%.
 */
export interface AprSnapshot {
  id: string;
  exchange: string;            // 'binance' | 'okx' | 'kucoin' | 'kraken' | 'aave' | 'yearn'
  asset: string;               // 'USDT', 'ETH', etc.
  product: string | null;      // e.g. 'Flexible Savings'
  apr: number;                 // decimal — 0.052 = 5.2%
  apy: number | null;
  minAmount: number | null;
  currency: string;
  source: 'live' | 'sample';
  syncedAt: string;            // ISO 8601
}

export interface AprHistoryEntry {
  id: string;
  exchange: string;
  asset: string;
  apr: number;
  recordedAt: string;          // ISO 8601
}

export interface AprTrendResult {
  exchange: string;
  asset: string;
  currentApr: number;
  previousApr: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

// ─── Legacy types kept for reference during component migration ───────────────

export type PlatformType = 'exchange' | 'defi';
export type RiskLevel = 'low' | 'medium' | 'high';

/** @deprecated Use AprSnapshot for V2. Kept for component migration reference. */
export interface AprOpportunity {
  id: string;
  symbol: string;
  asset: string;
  platform: string;
  platformType: PlatformType;
  chain: string;
  apr: number;
  apy?: number;
  lockPeriod?: string;
  minStake?: number;
  riskLevel?: RiskLevel;
  source?: string;
  lastUpdated: string;
}
