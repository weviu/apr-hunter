'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { ImportFromExchange } from '@/components/ImportFromExchange';
import { CexHolding } from '@/lib/exchanges/cex-adapter';
import { useAuth } from '@/lib/auth';

const PLATFORMS = ['OKX', 'KuCoin', 'Binance', 'Kraken', 'Aave'];
const POPULAR_ASSETS = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'AVAX', 'MATIC', 'UNI', 'LTC'];
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export default function NewPositionPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, token } = useAuth();

  const [formData, setFormData] = useState({
    platform: '',
    asset: '',
    amount: '',
    entryApr: '',
    entryPrice: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const assetMenuBlur = useRef<NodeJS.Timeout | null>(null);
  const [aprData, setAprData] = useState<any[]>([]);

  const assetsQuery = useQuery({
    queryKey: ['assets-autocomplete', formData.platform],
    queryFn: () =>
      fetch(`${API_BASE}/api/apr/assets${formData.platform ? `?platform=${formData.platform}` : ''}`).then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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

  const assetOptions = useMemo(() => {
    const apiAssets = assetsQuery.data?.data || [];
    const platformAssets = formData.platform
      ? (aprData || []).filter((d) => d.platform && d.platform.toLowerCase() === formData.platform.toLowerCase())
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
  }, [assetsQuery.data, aprData, formData.platform]);

  const filteredAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    if (!term) return assetOptions;
    return assetOptions.filter((opt) => opt.value.toLowerCase().includes(term) || opt.label.toLowerCase().includes(term));
  }, [assetOptions, assetSearch]);

  useEffect(() => {
    if (!formData.platform || !formData.asset) return;
    const controller = new AbortController();
    async function fetchAprForAsset() {
      try {
        const assetSymbol = formData.asset.toUpperCase();
        const res = await fetch(`${API_BASE}/api/apr/asset/${assetSymbol}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const list: any[] = Array.isArray(data?.data) ? data.data : [];
        const platformMatch = list.find(
          (item) =>
            item?.platform &&
            item.platform.toLowerCase() === formData.platform.toLowerCase()
        );
        const best = platformMatch || list[0];
        if (best?.apr !== undefined) {
          setFormData((prev) => ({ ...prev, entryApr: best.apr.toString() }));
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Failed to fetch APR for asset:', err);
      }
    }
    fetchAprForAsset();
    return () => controller.abort();
  }, [formData.platform, formData.asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const validAsset = assetOptions.some((opt) => opt.value === formData.asset);
    if (!validAsset) {
      setError('Please select a valid asset from the list.');
      setIsSubmitting(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          platform: formData.platform,
          asset: formData.asset.toUpperCase(),
          amount: parseFloat(formData.amount),
          entryApr: parseFloat(formData.entryApr),
          entryPrice: formData.entryPrice ? parseFloat(formData.entryPrice) : undefined,
          notes: formData.notes || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create position');
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportFromExchange = async (holding: CexHolding) => {
    setFormData((prev) => ({
      ...prev,
      platform: holding.platform,
      asset: holding.asset,
      amount: holding.amount.toString(),
    }));
    setShowImportModal(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Add New Position</h1>
          <p className="text-gray-400 mb-8">Track a new staking or earn position from any platform.</p>

          {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Platform *</label>
              <div className="relative">
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="" disabled hidden />
                  {PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
                {!formData.platform && (
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-gray-400 opacity-70">
                    Select a platform
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Asset *</label>
              <div className="relative">
                <input
                  type="text"
                  value={assetSearch || formData.asset}
                  onFocus={() => {
                    if (!formData.platform) return;
                    if (assetMenuBlur.current) clearTimeout(assetMenuBlur.current);
                    setIsAssetMenuOpen(true);
                  }}
                  onBlur={() => {
                    assetMenuBlur.current = setTimeout(() => setIsAssetMenuOpen(false), 120);
                  }}
                  onChange={(e) => {
                    setAssetSearch(e.target.value.toUpperCase());
                    setIsAssetMenuOpen(true);
                  }}
                  placeholder={formData.platform ? 'Select an asset from the list' : 'Select a platform first'}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                  disabled={!formData.platform}
                />
                {isAssetMenuOpen && (
                  <div className="absolute z-10 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 divide-y divide-gray-800 shadow-lg mt-1">
                    {filteredAssets.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">No assets found</div>
                    ) : (
                      filteredAssets.map((asset) => (
                        <button
                          key={asset.value}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData({ ...formData, asset: asset.value });
                            setAssetSearch('');
                            setIsAssetMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm ${
                            formData.asset === asset.value ? 'bg-emerald-500/10 text-emerald-300' : 'text-gray-200 hover:bg-gray-800'
                          }`}
                        >
                          {asset.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount *</label>
              <input
                type="number"
                step="any"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Entry APR (%) *</label>
              {formData.entryApr ? (
                <p className="px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white">{parseFloat(formData.entryApr).toFixed(2)}%</p>
              ) : (
                <p className="px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-500">Waiting for APR data...</p>
              )}
              <input type="hidden" name="entryApr" value={formData.entryApr} />
              <p className="text-xs text-gray-500 mt-1">APR auto-fills from the selected exchange/asset when available.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Entry Price (USD) <span className="text-gray-500">- optional</span></label>
              <input
                type="number"
                step="any"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                placeholder="e.g., 3500.00"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Used to calculate your position&apos;s USD value.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes <span className="text-gray-500">- optional</span></label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any notes about this position..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 rounded-lg disabled:opacity-50 transition-colors font-medium"
              >
                Import from Exchange
              </button>
              <Link href="/dashboard" className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-center transition-colors">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !formData.entryApr}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Position'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {showImportModal && (
        <ImportFromExchange
          onImport={handleImportFromExchange}
          onClose={() => setShowImportModal(false)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}

