export type PlatformType = 'exchange' | 'defi';
export type RiskLevel = 'low' | 'medium' | 'high';

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

export type AprTrend = 'up' | 'down' | 'flat';

export interface AprTrendResponse {
  success: boolean;
  asset: string;
  platform: string;
  latest: number | null;
  trend24h: { deltaAbs: number; deltaPct: number; trend: AprTrend };
  trend7d: { deltaAbs: number; deltaPct: number; trend: AprTrend };
}

export interface AggregatedAprResponse {
  opportunities: AprOpportunity[];
  fetchedAt: string;
  meta: {
    exchanges: string[];
    assets: string[];
    staleSources: string[];
  };
}
