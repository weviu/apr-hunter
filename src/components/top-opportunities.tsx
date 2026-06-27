'use client';

import { TrendingUp, ExternalLink, Clock, RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { AprSnapshot, AprTrendResult } from '@/types/apr';
import { useTopRates, useAprTrends } from '@/hooks/useApr';
import { PLATFORM_LINKS, formatApr, getProductLabel, getFreshness } from '@/lib/utils/apr-utils';

function getTrendBadge(trends: AprTrendResult[], exchange: string, asset: string) {
  const t = trends.find(
    (r) => r.exchange.toLowerCase() === exchange.toLowerCase() && r.asset.toUpperCase() === asset.toUpperCase()
  );
  if (!t) return null;

  const pct = ((t.currentApr - t.previousApr) / (t.previousApr || 1)) * 100;
  const label = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% (24h)`;

  if (t.direction === 'up') {
    return (
      <span className="inline-flex items-center text-blue-400 text-xs gap-1">
        <ArrowUpRight className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (t.direction === 'down') {
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
}

export function TopOpportunities() {
  const { data: opportunities = [], isLoading, error, refetch, isFetching } = useTopRates(10);
  const { data: trends = [] } = useAprTrends(50);

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-8">
        <p className="text-red-400">Failed to load top opportunities. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="h-4 w-4" />
          <span>Auto-updates every 30s</span>
          {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-blue-700" />}
        </div>
        <button
          onClick={() => void refetch()}
          className="text-sm text-blue-700 hover:text-blue-400 flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No opportunities available at the moment.</div>
      ) : (
        <div className="space-y-3">
          {(opportunities as AprSnapshot[]).map((item, index) => {
            const freshness = getFreshness(item.syncedAt);
            const platformLink = PLATFORM_LINKS[item.exchange];

            return (
              <div
                key={item.id || index}
                className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-blue-700/50 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-700/20 text-blue-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{item.asset}</span>
                      {platformLink ? (
                        <a
                          href={platformLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-400"
                        >
                          {item.exchange}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">on {item.exchange}</span>
                      )}
                      {item.product && (
                        <span className="px-2 py-0.5 text-xs rounded-full text-blue-400 bg-blue-700/20">
                          {getProductLabel(item.product)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs flex items-center gap-1 ${freshness.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${freshness.dotColor} animate-pulse`} />
                        {freshness.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-lg font-bold text-blue-400">
                      <TrendingUp className="h-5 w-5" />
                      <span>{formatApr(item.apr)}</span>
                    </div>
                    {item.apy && (
                      <div className="text-xs text-gray-500">APY: {formatApr(item.apy)}</div>
                    )}
                    <div className="mt-1">
                      {getTrendBadge(trends as AprTrendResult[], item.exchange, item.asset)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500 space-y-2">
        <p>
          Data sourced from{' '}
          <a href="https://www.okx.com/earn" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">OKX Earn</a>
          {', '}
          <a href="https://www.kucoin.com/earn" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">KuCoin Earn</a>
          {', and '}
          <a href="https://www.binance.com/en/earn" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Binance Simple Earn</a>
          . Real staking rates, updated every 30 seconds.
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Live
          <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2" /> &lt;1h
          <span className="w-2 h-2 rounded-full bg-orange-500 ml-2" /> &gt;1h
          <span className="w-2 h-2 rounded-full bg-red-500 ml-2" /> Stale
        </div>
      </div>
    </div>
  );
}
