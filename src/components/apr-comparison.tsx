'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Clock, RefreshCw, Info } from 'lucide-react';
import { AprSnapshot } from '@/types/apr';
import { useAprByAsset, useAprAssets } from '@/hooks/useApr';
import { PLATFORM_LINKS, formatApr, getProductLabel, getExchangeType, getFreshness } from '@/lib/utils/apr-utils';
import { Card, Skeleton } from '@/components/ui';

const DEFAULT_ASSETS = [
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' },
  { value: 'USDT', label: 'Tether (USDT)' },
  { value: 'USDC', label: 'USD Coin (USDC)' },
  { value: 'SOL', label: 'Solana (SOL)' },
  { value: 'XRP', label: 'XRP' },
  { value: 'ADA', label: 'Cardano (ADA)' },
  { value: 'DOGE', label: 'Dogecoin (DOGE)' },
  { value: 'AVAX', label: 'Avalanche (AVAX)' },
  { value: 'DOT', label: 'Polkadot (DOT)' },
  { value: 'MATIC', label: 'Polygon (MATIC)' },
  { value: 'ATOM', label: 'Cosmos (ATOM)' },
  { value: 'LINK', label: 'Chainlink (LINK)' },
];

const thClass = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-fg-faint';

export function AprComparison() {
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [assetSearch, setAssetSearch] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  // Close the asset dropdown on any click/tap outside it. This replaces an
  // onBlur+setTimeout close that raced with the 30s background refetch and made
  // the menu flicker.
  useEffect(() => {
    if (!isSearchOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isSearchOpen]);

  const { data: assetList = [] } = useAprAssets();

  const assetOptions = useMemo(() => {
    if (Array.isArray(assetList) && assetList.length > 0) {
      return (assetList as string[]).map((s) => ({ value: s, label: s }));
    }
    return DEFAULT_ASSETS;
  }, [assetList]);

  const filteredAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    if (!term) return assetOptions;
    return assetOptions.filter(
      (opt) => opt.value.toLowerCase().includes(term) || opt.label.toLowerCase().includes(term)
    );
  }, [assetOptions, assetSearch]);

  const { data: assetData, isLoading, error, refetch, isFetching } = useAprByAsset(selectedAsset);
  const aprData: AprSnapshot[] = assetData?.rates ?? [];

  const sortedData = [...aprData].sort((a, b) => b.apr - a.apr);

  if (isLoading) {
    return (
      <Card className="space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <p className="text-danger">Failed to load APR data. Please try again later.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg-muted">Select Asset</label>
          <div className="flex items-center gap-3">
            <div ref={searchRef} className="relative w-full sm:w-72">
            <input
              type="text"
              value={assetSearch}
              onChange={(e) => {
                setAssetSearch(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search assets…"
              className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-fg placeholder:text-fg-faint transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            {isSearchOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-full divide-y divide-hairline overflow-y-auto rounded-md border border-hairline bg-surface shadow-overlay">
                {filteredAssets.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-fg-faint">No assets found</div>
                ) : (
                  filteredAssets.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSelectedAsset(opt.value);
                        setAssetSearch('');
                        setIsSearchOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition hover:bg-surface-hover ${
                        selectedAsset === opt.value ? 'bg-accent-soft text-accent' : 'text-fg'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))
                )}
              </div>
            )}
            </div>
            <div
              className="flex shrink-0 items-center gap-2 rounded-md border border-hairline bg-surface px-3 py-2"
              title="Currently selected asset"
            >
              <span className="text-xs text-fg-faint">Showing</span>
              <span className="text-sm font-semibold text-accent">{selectedAsset}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
      </div>

      {aprData.length === 0 ? (
        <div className="py-12 text-center">
          <Info className="mx-auto mb-4 h-12 w-12 text-fg-faint" />
          <p className="text-fg-muted">
            No staking data available for <span className="font-medium text-fg">{selectedAsset}</span>.
          </p>
          <p className="mt-2 text-sm text-fg-faint">This asset may not have staking options right now.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th className={thClass}>Platform</th>
                <th className={thClass}>Product</th>
                <th className={thClass}>APR</th>
                <th className={thClass}>APY</th>
                <th className={thClass}>Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {aprData.map((item, index) => {
                const freshness = getFreshness(item.syncedAt, item.source);
                const platformLink = PLATFORM_LINKS[item.exchange];
                const exchangeType = getExchangeType(item.exchange);
                const isTop = sortedData[0]?.id === item.id;
                const isBottom = sortedData[sortedData.length - 1]?.id === item.id && sortedData.length > 1;

                return (
                  <tr key={item.id || index} className="transition hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-4">
                      {platformLink ? (
                        <a
                          href={platformLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm font-medium text-fg transition hover:text-accent"
                        >
                          {item.exchange}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-fg">{item.exchange}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                          {getProductLabel(item.product ?? undefined)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            exchangeType === 'DeFi'
                              ? 'bg-success-soft text-success'
                              : 'border border-hairline text-fg-muted'
                          }`}
                        >
                          {exchangeType}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-1">
                        {isTop && sortedData.length > 1 && <TrendingUp className="h-4 w-4 text-success" />}
                        {isBottom && <TrendingDown className="h-4 w-4 text-danger" />}
                        {!isTop && !isBottom && <span className="w-4" />}
                        <span className="text-sm font-semibold text-accent">{formatApr(item.apr)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-fg-muted">
                      {item.apy ? formatApr(item.apy) : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${freshness.dotColor} animate-pulse`} />
                        <span className={`text-xs ${freshness.color}`}>{freshness.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 border-t border-hairline pt-4 text-xs text-fg-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          Data sourced from{' '}
          <a href="https://www.okx.com/earn" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">OKX Earn</a>
          {', '}
          <a href="https://www.kucoin.com/earn" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">KuCoin Earn</a>
          {', '}
          <a href="https://www.binance.com/en/earn" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Binance Simple Earn</a>
          {', plus DeFi yields from '}
          <a href="https://app.aave.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Aave</a>
          {' and '}
          <a href="https://yearn.fi" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Yearn</a>
          {' (via '}
          <a href="https://defillama.com/yields" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">DefiLlama</a>
          ). Real rates, updated every 30 seconds.
        </p>
        <p className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Live
          <span className="ml-2 h-2 w-2 rounded-full bg-yellow-500" /> &lt;1h
          <span className="ml-2 h-2 w-2 rounded-full bg-orange-500" /> &gt;1h
          <span className="ml-2 h-2 w-2 rounded-full bg-red-500" /> Stale
        </p>
      </div>
    </Card>
  );
}
