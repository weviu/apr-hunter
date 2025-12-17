'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, ExternalLink, Clock, RefreshCw, Info } from 'lucide-react';

interface AprData {
  _id?: string;
  asset: string;
  platform: string;
  platformType: 'exchange' | 'defi';
  chain: string;
  apr: number;
  apy?: number;
  minStake?: number;
  lockPeriod?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  lastUpdated: string;
  source?: string;
}

// Platform links
const PLATFORM_LINKS: Record<string, string> = {
  'OKX': 'https://www.okx.com/earn',
  'Binance': 'https://www.binance.com/en/earn',
  'KuCoin': 'https://www.kucoin.com/earn',
  'Kraken': 'https://www.kraken.com/learn/what-is-crypto-staking',
  'Aave': 'https://app.aave.com',
};

// Get product type label
function getProductLabel(source?: string): string {
  if (source?.includes('earn') || source?.includes('staking')) return 'Staking';
  if (source?.includes('lending')) return 'Lending';
  return 'Earn';
}

// Get freshness status
function getFreshness(lastUpdated?: string): { label: string; color: string; dotColor: string } {
  if (!lastUpdated) return { label: 'Unknown', color: 'text-gray-400', dotColor: 'bg-gray-400' };
  
  const now = new Date();
  const updated = new Date(lastUpdated);
  const diffMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
  
  if (diffMinutes < 5) {
    return { label: 'Live', color: 'text-green-500', dotColor: 'bg-green-500' };
  } else if (diffMinutes < 30) {
    return { label: `${diffMinutes}m ago`, color: 'text-green-400', dotColor: 'bg-green-400' };
  } else if (diffMinutes < 60) {
    return { label: `${diffMinutes}m ago`, color: 'text-yellow-500', dotColor: 'bg-yellow-500' };
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return { label: `${hours}h ago`, color: 'text-orange-500', dotColor: 'bg-orange-500' };
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return { label: `${days}d ago`, color: 'text-red-500', dotColor: 'bg-red-500' };
  }
}

export function AprComparison() {
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [assetSearch, setAssetSearch] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);

  const aprAssetsQuery = useQuery({
    queryKey: ['apr-assets'],
    queryFn: () => api.get('/api/apr/assets'),
    staleTime: 5 * 60 * 1000,
  });

  const allAssetsQuery = useQuery({
    queryKey: ['all-assets'],
    queryFn: () => api.get('/api/assets'),
    staleTime: 5 * 60 * 1000,
  });

  const assetOptions = useMemo(() => {
    const aprAssets = aprAssetsQuery.data?.data?.data || [];
    const allAssets = allAssetsQuery.data?.data?.data || [];

    const mergedMap = new Map<string, string>();

    for (const a of allAssets) {
      if (a?.symbol) mergedMap.set(a.symbol.toUpperCase(), a.name || a.symbol);
    }
    for (const a of aprAssets) {
      if (a?.symbol) mergedMap.set(a.symbol.toUpperCase(), a.name || a.symbol);
    }

    const merged = Array.from(mergedMap.entries()).map(([symbol, name]) => ({
      value: symbol,
      label: `${name} (${symbol})`,
    }));

    if (merged.length > 0) {
      return merged.sort((a, b) => a.label.localeCompare(b.label));
    }

    // fallback static list
    return [
      { value: 'BTC', label: 'Bitcoin (BTC)' },
      { value: 'ETH', label: 'Ethereum (ETH)' },
      { value: 'USDT', label: 'Tether (USDT)' },
      { value: 'USDC', label: 'USD Coin (USDC)' },
      { value: 'SOL', label: 'Solana (SOL)' },
      { value: 'TON', label: 'Toncoin (TON)' },
      { value: 'XRP', label: 'XRP' },
      { value: 'ADA', label: 'Cardano (ADA)' },
      { value: 'DOGE', label: 'Dogecoin (DOGE)' },
      { value: 'AVAX', label: 'Avalanche (AVAX)' },
      { value: 'DOT', label: 'Polkadot (DOT)' },
      { value: 'MATIC', label: 'Polygon (MATIC)' },
      { value: 'ATOM', label: 'Cosmos (ATOM)' },
      { value: 'TRX', label: 'TRON (TRX)' },
      { value: 'LINK', label: 'Chainlink (LINK)' },
    ];
  }, [aprAssetsQuery.data, allAssetsQuery.data]);

  const filteredAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    if (!term) return assetOptions;
    return assetOptions.filter(
      (opt) =>
        opt.value.toLowerCase().includes(term) ||
        opt.label.toLowerCase().includes(term)
    );
  }, [assetOptions, assetSearch]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['apr', selectedAsset],
    queryFn: () => api.get(`/api/apr/asset/${selectedAsset}?includeHistory=true`),
    refetchInterval: 30000,
  });

  const aprData: AprData[] = data?.data?.data || [];
  const knownPlatforms = ['OKX', 'Binance', 'KuCoin'];
  const missingPlatforms = knownPlatforms.filter(
    (p) => !aprData.some((d) => d.platform.toLowerCase() === p.toLowerCase())
  );

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-400 bg-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'high':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-700 rounded w-48"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-8">
        <p className="text-red-400">
          Failed to load APR data. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Asset Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Asset
          </label>
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
                // Delay closing to allow click selection
                blurTimeout.current = setTimeout(() => setIsSearchOpen(false), 120);
              }}
              placeholder="Search assets..."
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {isSearchOpen && (
              <div className="absolute z-10 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 divide-y divide-gray-800 shadow-lg">
                {filteredAssets.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No assets found</div>
                ) : (
                  filteredAssets.map((opt) => (
                    <button
                      key={opt.value}
                      onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                      onClick={() => {
                        setSelectedAsset(opt.value);
                        setAssetSearch('');
                        setIsSearchOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
                        selectedAsset === opt.value ? 'bg-emerald-500/10 text-emerald-300' : 'text-gray-200'
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
        
        {/* Refresh controls */}
        <div className="flex items-center gap-4">
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
      </div>

      {/* Comparison Table */}
      {aprData.length === 0 ? (
        <div className="text-center py-12">
          <Info className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            No staking data available for <span className="text-white font-semibold">{selectedAsset}</span> on our active exchanges.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This asset may not have staking options right now. Try another asset or check back soon.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Chain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  APR
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  APY
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Lock Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {aprData.map((item, index) => {
                const freshness = getFreshness(item.lastUpdated);
                const platformLink = PLATFORM_LINKS[item.platform];
                const sortedData = [...aprData].sort((a, b) => b.apr - a.apr);
                const isTop = sortedData[0]?._id === item._id;
                const isBottom = sortedData[sortedData.length - 1]?._id === item._id && sortedData.length > 1;
                
                return (
                  <tr key={item._id || index} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {platformLink ? (
                          <a
                            href={platformLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm font-medium text-white hover:text-emerald-400"
                          >
                            {item.platform}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-white">
                            {item.platform}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs rounded-full text-emerald-400 bg-emerald-500/20">
                          {getProductLabel(item.source)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">
                      {item.chain}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {isTop && sortedData.length > 1 && (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        )}
                        {isBottom && (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        {!isTop && !isBottom && (
                          <span className="w-4" />
                        )}
                        <span className="text-sm font-semibold text-emerald-400">
                          {item.apr.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {item.apy ? `${item.apy.toFixed(2)}%` : 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {item.lockPeriod || 'Flexible'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(item.riskLevel)}`}>
                        {item.riskLevel ? item.riskLevel.toUpperCase() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${freshness.dotColor} animate-pulse`}></span>
                        <span className={`text-xs ${freshness.color}`}>
                          {freshness.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {missingPlatforms.length > 0 && (
            <div className="mt-4 text-xs text-gray-500">
              No offers currently for {selectedAsset} on {missingPlatforms.join(', ')}. Data shown only for exchanges that have this asset.
            </div>
          )}
        </div>
      )}
      
      {/* Data source footer */}
      <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
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
        <p className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span> Live
          <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2"></span> &lt;1h
          <span className="w-2 h-2 rounded-full bg-orange-500 ml-2"></span> &gt;1h
          <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> Stale
        </p>
      </div>
    </div>
  );
}
