'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2 } from 'lucide-react';
import { CexHolding } from '@/lib/exchanges/cex-adapter';

const PLATFORMS = ['Binance', 'OKX', 'KuCoin', 'Kraken', 'Aave'];
const POPULAR_ASSETS = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'AVAX', 'MATIC', 'UNI', 'LTC'];
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

interface PositionFormProps {
  onSubmit: (data: {
    symbol: string;
    asset: string;
    platform: string;
    platformType?: string;
    chain?: string;
    amount: number;
    apr?: number;
  }) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  onImportClick?: () => void;
  portfolioType?: 'web2' | 'web3';
}

export function PositionForm({ onSubmit, isLoading = false, onCancel, onImportClick, portfolioType = 'web2' }: PositionFormProps) {
  const [platform, setPlatform] = useState('');
  const [chain, setChain] = useState('');
  const [asset, setAsset] = useState('');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [apr, setApr] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [aprData, setAprData] = useState<any[]>([]);

  const platformMenuRef = useRef<HTMLDivElement>(null);
  const assetMenuRef = useRef<HTMLDivElement>(null);

  // Fetch APR data
  useEffect(() => {
    async function fetchAprData() {
      try {
        const res = await fetch(`${API_BASE}/api/apr`);
        if (res.ok) {
          const data = await res.json();
          setAprData(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (err) {
        console.error('Failed to fetch APR data:', err);
      }
    }
    fetchAprData();
  }, []);

  // Fetch assets for selected platform
  const assetsQuery = useQuery({
    queryKey: ['assets-autocomplete', platform],
    queryFn: () =>
      fetch(`${API_BASE}/api/apr/assets${platform ? `?platform=${platform}` : ''}`).then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
    enabled: !!platform,
  });

  // Fetch APR when platform and asset are selected
  useEffect(() => {
    if (!platform || !asset) return;
    const controller = new AbortController();
    async function fetchAprForAsset() {
      try {
        const assetSymbol = asset.toUpperCase();
        const res = await fetch(`${API_BASE}/api/apr/asset/${assetSymbol}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const list: any[] = Array.isArray(data?.data) ? data.data : [];
        const platformMatch = list.find(
          (item) =>
            item?.platform &&
            item.platform.toLowerCase() === platform.toLowerCase()
        );
        const best = platformMatch || list[0];
        if (best?.apr !== undefined) {
          setApr(best.apr.toString());
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Failed to fetch APR for asset:', err);
      }
    }
    fetchAprForAsset();
    return () => controller.abort();
  }, [platform, asset]);

  // Auto-fill symbol when asset is selected
  useEffect(() => {
    if (asset) {
      setSymbol(asset.toUpperCase());
    } else {
      setSymbol('');
    }
  }, [asset]);

  // Generate asset options
  const assetOptions = useMemo(() => {
    const apiAssets = assetsQuery.data?.data || [];
    const platformAssets = platform
      ? (aprData || []).filter((d) => d.platform && d.platform.toLowerCase() === platform.toLowerCase())
      : [];

    const merged = new Map<string, string>();

    if (Array.isArray(apiAssets)) {
      apiAssets.forEach((a: any) => {
        if (a?.symbol) merged.set(a.symbol.toUpperCase(), a.name || a.symbol);
      });
    }

    platformAssets.forEach((d: any) => {
      if (d?.asset) {
        merged.set(d.asset.toUpperCase(), d.asset.toUpperCase());
      }
    });

    if (merged.size === 0) {
      return POPULAR_ASSETS.map((symbol) => ({ value: symbol, label: symbol }));
    }

    return Array.from(merged.entries())
      .map(([symbol, name]) => ({ value: symbol, label: `${name} (${symbol})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assetsQuery.data, aprData, platform]);

  const filteredAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    if (!term) return assetOptions;
    return assetOptions.filter((opt) => opt.value.toLowerCase().includes(term) || opt.label.toLowerCase().includes(term));
  }, [assetOptions, assetSearch]);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (platformMenuRef.current && !platformMenuRef.current.contains(event.target as Node)) {
        setIsPlatformMenuOpen(false);
      }
      if (assetMenuRef.current && !assetMenuRef.current.contains(event.target as Node)) {
        setIsAssetMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!symbol.trim() || !asset.trim() || !platform.trim() || !amount) {
      setError('Symbol, asset, platform, and amount are required');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    const aprNum = apr ? parseFloat(apr) : undefined;
    if (apr && (isNaN(aprNum!) || aprNum! < 0)) {
      setError('APR must be a non-negative number');
      return;
    }

    try {
      await onSubmit({
        symbol: symbol.toUpperCase().trim(),
        asset: asset.toUpperCase().trim(),
        platform: platform.trim(),
        chain: chain || undefined,
        amount: amountNum,
        apr: aprNum,
      });
      // Reset form
      setPlatform('');
      setChain('');
      setAsset('');
      setSymbol('');
      setAmount('');
      setApr('');
      setAssetSearch('');
    } catch (err: any) {
      setError(err.message || 'Failed to create position');
    }
  };

  const prefillFromExchange = (holding: CexHolding) => {
    setPlatform(holding.platform);
    setAsset(holding.asset);
    setAmount(holding.amount.toString());
    if (holding.chain) setChain(holding.chain);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {/* Row 1: Platform & Chain */}
      <div className="grid grid-cols-2 gap-4">
        {/* Platform Dropdown */}
        <div ref={platformMenuRef} className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-1">Platform *</label>
          <button
            type="button"
            onClick={() => setIsPlatformMenuOpen(!isPlatformMenuOpen)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left flex justify-between items-center disabled:opacity-50"
          >
            <span>{platform || 'Select platform'}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {isPlatformMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPlatform(p);
                    setIsPlatformMenuOpen(false);
                    setAsset('');
                    setSymbol('');
                    setApr('');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-600 text-white first:rounded-t-lg last:rounded-b-lg transition"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chain Field */}
        <div>
          <label htmlFor="chain" className="block text-sm font-medium text-gray-300 mb-1">
            Chain {portfolioType === 'web2' && '(disabled)'}
          </label>
          <input
            id="chain"
            type="text"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            disabled={portfolioType === 'web2' || isLoading}
            placeholder="Ethereum"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
          />
        </div>
      </div>

      {/* Row 2: Asset & Symbol */}
      <div className="grid grid-cols-2 gap-4">
        {/* Asset Dropdown with Search */}
        <div ref={assetMenuRef} className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Asset * {!platform && '(select platform first)'}
          </label>
          <button
            type="button"
            onClick={() => setIsAssetMenuOpen(!isAssetMenuOpen)}
            disabled={!platform || isLoading}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{asset || 'Select asset'}</span>
            {assetsQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {isAssetMenuOpen && platform && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 flex flex-col">
              <input
                type="text"
                placeholder="Search assets..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="px-3 py-2 bg-gray-600 text-white border-b border-gray-500 rounded-t-lg focus:outline-none placeholder-gray-400"
              />
              <div className="overflow-y-auto">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAsset(opt.value);
                        setIsAssetMenuOpen(false);
                        setAssetSearch('');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-600 text-white transition text-sm"
                    >
                      {opt.label}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-400 text-sm">No assets found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Symbol Field (Read-only, auto-filled) */}
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-300 mb-1">
            Symbol
          </label>
          <input
            id="symbol"
            type="text"
            value={symbol}
            disabled={true}
            placeholder="Auto-filled"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-700 text-gray-400 rounded-lg focus:outline-none disabled:cursor-not-allowed placeholder-gray-500"
          />
        </div>
      </div>

      {/* Row 3: Amount & APR */}
      <div className="grid grid-cols-2 gap-4">
        {/* Amount Field */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">
            Amount *
          </label>
          <input
            id="amount"
            type="number"
            step="0.00000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            placeholder="2.5"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 placeholder-gray-500"
          />
        </div>

        {/* APR Field (Read-only, auto-filled) */}
        <div>
          <label htmlFor="apr" className="block text-sm font-medium text-gray-300 mb-1">
            APR
          </label>
          <input
            id="apr"
            type="number"
            step="0.01"
            value={apr}
            disabled={true}
            placeholder="Auto-filled"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-700 text-gray-400 rounded-lg focus:outline-none disabled:cursor-not-allowed placeholder-gray-500"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4 flex-col sm:flex-row">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium transition"
        >
          {isLoading ? 'Adding...' : 'Add Position'}
        </button>
        {onImportClick && (
          <button
            type="button"
            onClick={onImportClick}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 rounded-lg disabled:opacity-50 transition font-medium"
          >
            Import from Exchange
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-700 text-white hover:bg-gray-800 rounded-lg disabled:opacity-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export { type PositionFormProps };
