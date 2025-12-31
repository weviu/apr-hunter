'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, ExternalLink, Clock, RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { AprTrendResponse } from '@/types/apr';

interface AprData {
  _id?: string;
  asset: string;
  platform: string;
  platformType: 'exchange' | 'defi';
  chain: string;
  apr: number;
  apy?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  lastUpdated?: string;
  source?: string;
}

// Platform links for source attribution
const PLATFORM_LINKS: Record<string, string> = {
  OKX: 'https://www.okx.com/earn',
  Binance: 'https://www.binance.com/en/earn',
  KuCoin: 'https://www.kucoin.com/earn',
  Kraken: 'https://www.kraken.com/learn/what-is-crypto-staking',
  Aave: 'https://app.aave.com',
};

// Get product type label
function getProductLabel(source?: string): string {
  if (source?.includes('earn') || source?.includes('staking')) return 'Staking';
  if (source?.includes('lending')) return 'Lending';
  return 'Earn';
}

// Get freshness status
function getFreshness(lastUpdated?: string): { label: string; color: string; isStale: boolean } {
  if (!lastUpdated) return { label: 'Unknown', color: 'text-gray-400', isStale: true };

  const now = new Date();
  const updated = new Date(lastUpdated);
  const diffMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));

  if (diffMinutes < 5) {
    return { label: 'Live', color: 'text-green-500', isStale: false };
  } else if (diffMinutes < 30) {
    return { label: `${diffMinutes}m ago`, color: 'text-green-400', isStale: false };
  } else if (diffMinutes < 60) {
    return { label: `${diffMinutes}m ago`, color: 'text-yellow-500', isStale: false };
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return { label: `${hours}h ago`, color: 'text-orange-500', isStale: true };
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return { label: `${days}d ago`, color: 'text-red-500', isStale: true };
  }
}

export function TopOpportunities() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['top-apr'],
    queryFn: () => api.get<{ data: AprData[] }>('/api/apr/top?limit=10'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const opportunities: AprData[] = data?.data?.data || [];

  const trendsQuery = useQuery({
    queryKey: ['top-apr-trends', opportunities.map((o) => `${o.platform}-${o.asset}`).join(',')],
    enabled: opportunities.length > 0,
    queryFn: async () => {
      const unique = Array.from(new Set(opportunities.map((o) => `${o.platform}|||${o.asset}`)));
      const results: Record<string, AprTrendResponse> = {};
      await Promise.all(
        unique.map(async (key) => {
          const [platform, asset] = key.split('|||');
          const res = await api.get<AprTrendResponse>(`/api/apr/trends?asset=${asset}&platform=${platform}`);
          results[key] = res.data;
        })
      );
      return results;
    },
    refetchInterval: 30000,
  });

  const getTrendBadge = (platform: string, asset: string) => {
    const key = `${platform}|||${asset}`;
    const t = trendsQuery.data?.[key];
    if (!t || !t.success || t.trend24h === undefined) return null;
    const { trend, deltaPct } = t.trend24h;
    const label = `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)}% (24h)`;
    if (trend === 'up') {
      return (
        <span className="inline-flex items-center text-emerald-400 text-xs gap-1">
          <ArrowUpRight className="h-3 w-3" />
          {label}
        </span>
      );
    }
    if (trend === 'down') {
      return (
        <span className="inline-flex items-center text-red-400 text-xs gap-1">
          <ArrowDownRight className="h-3 w-3" />
          {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-gray-400 text-xs gap-1">
        <Minus className="h-3 w-3" />
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-8">
        <p className="text-red-400">
          Failed to load top opportunities. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="h-4 w-4" />
          <span>Auto-updates every 30s</span>
          {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />}
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No opportunities available at the moment.
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((item, index) => {
            const freshness = getFreshness(item.lastUpdated);
            const platformLink = PLATFORM_LINKS[item.platform];

            return (
              <div
                key={item._id || index}
                className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-center space-x-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                    {index + 1}
                  </div>

                  {/* Asset info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">
                        {item.asset}
                      </span>
                      {platformLink ? (
                        <a
                          href={platformLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-emerald-500 hover:text-emerald-400"
                        >
                          {item.platform}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">
                          on {item.platform}
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-xs rounded-full text-emerald-400 bg-emerald-500/20">
                        {getProductLabel(item.source)}
                      </span>
                    </div>

                    {/* Freshness indicator */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 capitalize">
                        {item.chain}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className={`text-xs flex items-center gap-1 ${freshness.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${freshness.isStale ? 'bg-orange-500' : 'bg-green-500'} animate-pulse`}></span>
                        {freshness.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* APR */}
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-lg font-bold text-emerald-400">
                      <TrendingUp className="h-5 w-5" />
                      <span>{item.apr.toFixed(2)}%</span>
                    </div>
                    {item.apy && (
                      <div className="text-xs text-gray-500">
                        APY: {item.apy.toFixed(2)}%
                      </div>
                    )}
                    <div className="mt-1">
                      {getTrendBadge(item.platform, item.asset)}
                    </div>
                  </div>

                  {/* Risk level */}
                  {item.riskLevel && (
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        item.riskLevel === 'low'
                          ? 'text-green-400 bg-green-500/20'
                          : item.riskLevel === 'medium'
                          ? 'text-yellow-400 bg-yellow-500/20'
                          : 'text-red-400 bg-red-500/20'
                      }`}
                    >
                      {item.riskLevel.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Data source attribution */}
      <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500 space-y-2">
        <p>
          Data sourced from{' '}
          <a href="https://www.okx.com/earn" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
            OKX Earn
          </a>
          {', '}
          <a href="https://www.kucoin.com/earn" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
            KuCoin Earn
          </a>
          {', and '}
          <a href="https://www.binance.com/en/earn" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
            Binance Simple Earn
          </a>
          . Real staking rates, updated every 30 seconds.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <span className="flex items-center gap-1 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> Live
            <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2"></span> &lt;1h
            <span className="w-2 h-2 rounded-full bg-orange-500 ml-2"></span> &gt;1h
            <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> Stale
          </span>
          <span className="text-gray-500 hidden sm:inline">
            Refreshes every 30 seconds
          </span>
        </div>
      </div>
    </div>
  );
}
