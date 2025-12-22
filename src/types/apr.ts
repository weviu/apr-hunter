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

export interface AggregatedAprResponse {
  opportunities: AprOpportunity[];
  fetchedAt: string;
  meta: {
    exchanges: string[];
    assets: string[];
    staleSources: string[];
  };
}
