'use client';

import { TrendingUp, ExternalLink, Clock, RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { AprSnapshot, AprTrendResult } from '@/types/apr';
import { useTopRates, useAprTrends } from '@/hooks/useApr';
import { PLATFORM_LINKS, formatApr, getProductLabel, getFreshness } from '@/lib/utils/apr-utils';
import { Card, Skeleton } from '@/components/ui';

function getTrendBadge(trends: AprTrendResult[], exchange: string, asset: string) {
  const t = trends.find(
    (r) => r.exchange.toLowerCase() === exchange.toLowerCase() && r.asset.toUpperCase() === asset.toUpperCase()
  );
  if (!t) return null;

  const pct = ((t.currentApr - t.previousApr) / (t.previousApr || 1)) * 100;
  const label = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% (24h)`;

  if (t.direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <ArrowUpRight className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (t.direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-danger">
        <ArrowDownRight className="h-3 w-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
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
      <Card className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <p className="text-danger">Failed to load top opportunities. Please try again later.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Clock className="h-4 w-4" />
          <span>Auto-updates every 30s</span>
          {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-accent" />}
        </div>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-accent transition hover:bg-accent-soft"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div className="py-8 text-center text-fg-muted">No opportunities available at the moment.</div>
      ) : (
        <div className="space-y-3">
          {(opportunities as AprSnapshot[]).map((item, index) => {
            const freshness = getFreshness(item.syncedAt);
            const platformLink = PLATFORM_LINKS[item.exchange];

            return (
              <div
                key={item.id || index}
                className="flex items-center justify-between rounded-lg border border-hairline bg-canvas p-4 transition hover:bg-surface-hover hover:border-hairline-strong"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg">{item.asset}</span>
                      {platformLink ? (
                        <a
                          href={platformLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-accent transition hover:text-accent-hover"
                        >
                          {item.exchange}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-fg-muted">on {item.exchange}</span>
                      )}
                      {item.product && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                          {getProductLabel(item.product)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-xs ${freshness.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${freshness.dotColor} animate-pulse`} />
                        {freshness.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-lg font-semibold text-accent">
                    <TrendingUp className="h-5 w-5" />
                    <span>{formatApr(item.apr)}</span>
                  </div>
                  {item.apy && <div className="text-xs text-fg-faint">APY: {formatApr(item.apy)}</div>}
                  <div className="mt-1">{getTrendBadge(trends as AprTrendResult[], item.exchange, item.asset)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-2 border-t border-hairline pt-4 text-xs text-fg-faint">
        <p>
          Data sourced from{' '}
          <a href="https://www.okx.com/earn" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">OKX Earn</a>
          {', '}
          <a href="https://www.kucoin.com/earn" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">KuCoin Earn</a>
          {', and '}
          <a href="https://www.binance.com/en/earn" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Binance Simple Earn</a>
          . Real staking rates, updated every 30 seconds.
        </p>
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Live
          <span className="ml-2 h-2 w-2 rounded-full bg-yellow-500" /> &lt;1h
          <span className="ml-2 h-2 w-2 rounded-full bg-orange-500" /> &gt;1h
          <span className="ml-2 h-2 w-2 rounded-full bg-red-500" /> Stale
        </div>
      </div>
    </Card>
  );
}
