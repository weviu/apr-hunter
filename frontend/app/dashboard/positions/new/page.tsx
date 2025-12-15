'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { ArrowLeft, Loader2 } from 'lucide-react';

const PLATFORMS = [
  'Binance',
  'OKX',
  'KuCoin',
  'Bybit',
  'Kraken',
  'Coinbase',
  'Aave',
  'Compound',
  'Yearn',
  'Lido',
];

const POPULAR_ASSETS = [
  'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'ADA', 
  'DOGE', 'DOT', 'LINK', 'AVAX', 'MATIC', 'UNI', 'LTC'
];

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
  const [aprData, setAprData] = useState<any[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch APR data for auto-fill suggestions
  useEffect(() => {
    async function fetchAprData() {
      try {
        const res = await fetch('http://localhost:3001/api/apr');
        if (res.ok) {
          const data = await res.json();
          setAprData(data);
        }
      } catch (err) {
        console.error('Failed to fetch APR data:', err);
      }
    }
    fetchAprData();
  }, []);

  // Auto-fill APR when platform and asset are selected
  useEffect(() => {
    if (formData.platform && formData.asset) {
      const match = aprData.find(
        (d) => 
          d.platform.toLowerCase() === formData.platform.toLowerCase() &&
          d.asset.toUpperCase() === formData.asset.toUpperCase()
      );
      if (match && !formData.entryApr) {
        setFormData(prev => ({ ...prev, entryApr: match.apr.toString() }));
      }
    }
  }, [formData.platform, formData.asset, aprData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:3001/api/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create position');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Add New Position</h1>
          <p className="text-gray-400 mb-8">
            Track a new staking or earn position from any platform.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform *
              </label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="">Select a platform</option>
                {PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>

            {/* Asset */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Asset *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.asset}
                  onChange={(e) => setFormData({ ...formData, asset: e.target.value.toUpperCase() })}
                  placeholder="e.g., ETH, BTC, USDT"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {POPULAR_ASSETS.slice(0, 8).map((asset) => (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => setFormData({ ...formData, asset })}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      formData.asset === asset
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount *
              </label>
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

            {/* Entry APR */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entry APR (%) *
              </label>
              <input
                type="number"
                step="any"
                value={formData.entryApr}
                onChange={(e) => setFormData({ ...formData, entryApr: e.target.value })}
                placeholder="e.g., 5.5"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will auto-fill if we have data for your selected platform and asset.
              </p>
            </div>

            {/* Entry Price (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entry Price (USD) <span className="text-gray-500">- optional</span>
              </label>
              <input
                type="number"
                step="any"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                placeholder="e.g., 3500.00"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to calculate your position's USD value.
              </p>
            </div>

            {/* Notes (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes <span className="text-gray-500">- optional</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any notes about this position..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-center transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Position'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}


