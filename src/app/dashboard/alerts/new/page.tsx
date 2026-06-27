'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';
import { useAprAssets, useAprRates } from '@/hooks/useApr';
import { useCreateAlert } from '@/hooks/useAlerts';

export default function NewAlertPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { data: assets = [] } = useAprAssets();
  const createAlert = useCreateAlert();

  const [asset, setAsset] = useState('');
  const [exchange, setExchange] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [formError, setFormError] = useState('');

  // Get rates for the selected asset to show available exchanges + current APR
  const { data: assetRates = [] } = useAprRates(undefined, asset || undefined);
  const exchanges = [...new Set(assetRates.map((r) => r.exchange))].sort();
  const currentApr = assetRates.find((r) => r.exchange === exchange)?.apr;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Reset exchange when asset changes
  useEffect(() => {
    setExchange('');
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!asset || !threshold) {
      setFormError('Please fill in all required fields');
      return;
    }

    const thresholdNum = parseFloat(threshold);
    if (Number.isNaN(thresholdNum) || thresholdNum < 0) {
      setFormError('Please enter a valid threshold percentage');
      return;
    }

    try {
      await createAlert.mutateAsync({
        asset,
        exchange: exchange || undefined,
        condition,
        threshold: thresholdNum,
      });
      router.push('/dashboard/alerts');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create alert');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/alerts" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Alerts
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Create New Alert</h1>
          <p className="text-gray-400 mt-1">Get notified when APR rates change</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {formError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{formError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Asset <span className="text-red-400">*</span>
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-colors"
              >
                <option value="">Select an asset</option>
                {assets.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {asset && exchanges.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exchange / Platform (optional)</label>
                <select
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-colors"
                >
                  <option value="">Any exchange</option>
                  {exchanges.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {asset && exchange && currentApr !== undefined && (
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">
                  Current APR for {asset} on {exchange}:
                </p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{(currentApr * 100).toFixed(2)}%</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Alert When APR Goes</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCondition('above')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    condition === 'above' ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ArrowUp className={`h-5 w-5 ${condition === 'above' ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className={`font-medium ${condition === 'above' ? 'text-green-400' : 'text-gray-300'}`}>Above</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Alert when APR rises</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('below')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    condition === 'below' ? 'border-red-500 bg-red-500/10' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ArrowDown className={`h-5 w-5 ${condition === 'below' ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className={`font-medium ${condition === 'below' ? 'text-red-400' : 'text-gray-300'}`}>Below</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Alert when APR drops</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Threshold (%) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="e.g. 5.00"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-colors pr-8"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/dashboard/alerts"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-700 transition-colors text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={createAlert.isPending}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-800 hover:bg-blue-900 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createAlert.isPending ? 'Creating...' : 'Create Alert'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
