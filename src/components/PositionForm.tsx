'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2 } from 'lucide-react';

const PLATFORMS = ['Binance', 'OKX', 'KuCoin', 'Kraken', 'Aave'];
const POPULAR_ASSETS = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'AVAX', 'MATIC', 'UNI', 'LTC'];
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

interface PositionFormProps {
  onSubmit: (data: {
    asset: string;
    exchange: string;
    amount: number;
    aprAtEntry: number;
    protocol?: string | null;
    chainId?: number | null;
    walletAddress?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  onImportClick?: () => void;
}

export function PositionForm({ onSubmit, isLoading = false, onCancel, onImportClick }: PositionFormProps) {
  const [exchange, setExchange] = useState('');
  const [asset, setAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [apr, setApr] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isExchangeMenuOpen, setIsExchangeMenuOpen] = useState(false);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');

  const exchangeMenuRef = useRef<HTMLDivElement>(null);
  const assetMenuRef = useRef<HTMLDivElement>(null);

  // Fetch assets for selected exchange (uses APR endpoint)
  const assetsQuery = useQuery({
    queryKey: ['assets-autocomplete', exchange],
    queryFn: () =>
      fetch(`${API_BASE}/api/apr/assets`).then((res) => res.json()) as Promise<{ success: boolean; data: string[] }>,
    staleTime: 5 * 60 * 1000,
    enabled: !!exchange,
  });

  // Fetch APR for selected exchange+asset
  useEffect(() => {
    if (!exchange || !asset) return;
    const controller = new AbortController();
    async function fetchApr() {
      try {
        const res = await fetch(`${API_BASE}/api/apr/asset/${encodeURIComponent(asset)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { success: boolean; data?: { symbol: string; rates: Array<{ exchange: string; apr: number }> } };
        const rates = data.data?.rates ?? [];
        const match = rates.find((r) => r.exchange.toLowerCase() === exchange.toLowerCase());
        const best = match ?? rates[0];
        if (best?.apr !== undefined) {
          // API returns decimal (0.052 = 5.2%) — display as percentage
          setApr((best.apr * 100).toFixed(2));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    void fetchApr();
    return () => controller.abort();
  }, [exchange, asset]);

  const assetOptions = useMemo(() => {
    const apiAssets = assetsQuery.data?.data ?? [];
    if (Array.isArray(apiAssets) && apiAssets.length > 0) {
      return apiAssets.map((s: string) => ({ value: s, label: s }));
    }
    return POPULAR_ASSETS.map((s) => ({ value: s, label: s }));
  }, [assetsQuery.data]);

  const filteredAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    if (!term) return assetOptions;
    return assetOptions.filter((opt) => opt.value.toLowerCase().includes(term));
  }, [assetOptions, assetSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exchangeMenuRef.current && !exchangeMenuRef.current.contains(event.target as Node)) {
        setIsExchangeMenuOpen(false);
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

    if (!asset.trim() || !exchange.trim() || !amount) {
      setError('Asset, exchange, and amount are required');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    // apr field shows percentage, API expects decimal
    const aprNum = apr ? parseFloat(apr) / 100 : 0;
    if (apr && (isNaN(aprNum) || aprNum < 0)) {
      setError('APR must be a non-negative number');
      return;
    }

    try {
      await onSubmit({
        asset: asset.toUpperCase().trim(),
        exchange: exchange.toLowerCase().trim(),
        amount: amountNum,
        aprAtEntry: aprNum,
      });
      setExchange('');
      setAsset('');
      setAmount('');
      setApr('');
      setAssetSearch('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create position');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {/* Row 1: Exchange & Asset */}
      <div className="grid grid-cols-2 gap-4">
        {/* Exchange Dropdown */}
        <div ref={exchangeMenuRef} className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-1">Exchange *</label>
          <button
            type="button"
            onClick={() => setIsExchangeMenuOpen(!isExchangeMenuOpen)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-left flex justify-between items-center disabled:opacity-50"
          >
            <span>{exchange || 'Select exchange'}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {isExchangeMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setExchange(p);
                    setIsExchangeMenuOpen(false);
                    setAsset('');
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

        {/* Asset Dropdown with Search */}
        <div ref={assetMenuRef} className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Asset * {!exchange && '(select exchange first)'}
          </label>
          <button
            type="button"
            onClick={() => setIsAssetMenuOpen(!isAssetMenuOpen)}
            disabled={!exchange || isLoading}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-left flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{asset || 'Select asset'}</span>
            {assetsQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {isAssetMenuOpen && exchange && (
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
      </div>

      {/* Row 2: Amount & APR */}
      <div className="grid grid-cols-2 gap-4">
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
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:opacity-50 placeholder-gray-500"
          />
        </div>

        <div>
          <label htmlFor="apr" className="block text-sm font-medium text-gray-300 mb-1">
            APR % (auto-filled)
          </label>
          <input
            id="apr"
            type="number"
            step="0.01"
            value={apr}
            disabled
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
          className="flex-1 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg disabled:opacity-50 font-medium transition"
        >
          {isLoading ? 'Adding...' : 'Add Position'}
        </button>
        {onImportClick && (
          <button
            type="button"
            onClick={onImportClick}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-blue-800/50 text-blue-400 hover:bg-blue-800/10 rounded-lg disabled:opacity-50 transition font-medium"
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
