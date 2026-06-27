'use client';

import { useMemo, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Clock, RefreshCw, Info } from 'lucide-react';
import { AprSnapshot } from '@/types/apr';
import { useAprByAsset, useAprAssets } from '@/hooks/useApr';
import { PLATFORM_LINKS, formatApr, getProductLabel, getFreshness } from '@/lib/utils/apr-utils';

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

export function AprComparison() {
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [assetSearch, setAssetSearch] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-8">
        <p className="text-red-400">Failed to load APR data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Asset</label>
          <div className="space-y-2 relative">
            <input
              type="text"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              onFocus={() => {
                if (blurTimeout.current) clearTimeout(blurTimeout.current);
                setIsSearchOpen(true);
              }}
              onBlur={() => {
                blurTimeout.current = setTimeout(() => setIsSearchOpen(false), 120);
              }}
              placeholder="Search assets..."
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-700 focus:border-transparent"
            />
            {isSearchOpen && (
              <div className="absolute z-10 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 divide-y divide-gray-800 shadow-lg">
                {filteredAssets.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No assets found</div>
                ) : (
                  filteredAssets.map((opt) => (
                    <button
                      key={opt.value}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedAsset(opt.value);
                        setAssetSearch('');
                        setIsSearchOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
                        selectedAsset === opt.value ? 'bg-blue-700/10 text-blue-300' : 'text-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
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
      </div>

      {aprData.length === 0 ? (
        <div className="text-center py-12">
          <Info className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            No staking data available for <span className="text-white font-semibold">{selectedAsset}</span>.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This asset may not have staking options right now.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">APR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">APY</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {aprData.map((item, index) => {
                const freshness = getFreshness(item.syncedAt);
                const platformLink = PLATFORM_LINKS[item.exchange];
                const isTop = sortedData[0]?.id === item.id;
                const isBottom = sortedData[sortedData.length - 1]?.id === item.id && sortedData.length > 1;

                return (
                  <tr key={item.id || index} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {platformLink ? (
                          <a
                            href={platformLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm font-medium text-white hover:text-blue-400"
                          >
                            {item.exchange}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-white">{item.exchange}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-xs rounded-full text-blue-400 bg-blue-700/20">
                        {getProductLabel(item.product ?? undefined)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {isTop && sortedData.length > 1 && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {isBottom && <TrendingDown className="h-4 w-4 text-red-500" />}
                        {!isTop && !isBottom && <span className="w-4" />}
                        <span className="text-sm font-semibold text-blue-400">{formatApr(item.apr)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {item.apy ? formatApr(item.apy) : 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${freshness.dotColor} animate-pulse`} />
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

      <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
        <p>
          Data sourced from{' '}
          <a href="https://www.okx.com/earn" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">OKX Earn</a>
          {', '}
          <a href="https://www.kucoin.com/earn" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">KuCoin Earn</a>
          {', and '}
          <a href="https://www.binance.com/en/earn" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Binance Simple Earn</a>
          . Real staking rates, updated every 30 seconds.
        </p>
        <p className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Live
          <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2" /> &lt;1h
          <span className="w-2 h-2 rounded-full bg-orange-500 ml-2" /> &gt;1h
          <span className="w-2 h-2 rounded-full bg-red-500 ml-2" /> Stale
        </p>
      </div>
    </div>
  );
}
