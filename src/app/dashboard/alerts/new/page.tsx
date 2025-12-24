'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';

type AprData = {
  _id: string;
  platform: string;
  asset: string;
  apr: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export default function NewAlertPage() {
  const router = useRouter();
  const { user, isLoading, token } = useAuth();
  const [aprData, setAprData] = useState<AprData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [asset, setAsset] = useState('');
  const [platform, setPlatform] = useState('');
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    void fetchAprData();
  }, []);

  const fetchAprData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/apr`);
      if (res.ok) {
        const data = await res.json();
        setAprData(Array.isArray(data?.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch APR data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const assets = [...new Set(aprData.map((d) => d.asset))].sort();
  const platforms = [...new Set(aprData.map((d) => d.platform))].sort();
  const currentApr = aprData.find((d) => d.asset === asset && d.platform === platform)?.apr;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!asset || !platform || !threshold) {
      setError('Please fill in all fields');
      return;
    }
    const thresholdNum = parseFloat(threshold);
    if (Number.isNaN(thresholdNum) || thresholdNum < 0) {
      setError('Please enter a valid threshold percentage');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ asset, platform, alertType, threshold: thresholdNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data?.success ?? true)) {
        router.push('/dashboard/alerts');
      } else {
        setError(data?.error || 'Failed to create alert');
      }
    } catch (error) {
      setError('Failed to create alert. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
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
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Asset</label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                disabled={loadingData}
              >
                <option value="">Select an asset</option>
                {assets.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                disabled={loadingData}
              >
                <option value="">Select a platform</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {asset && platform && (
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">
                  Current APR for {asset} on {platform}:
                </p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{currentApr !== undefined ? `${currentApr.toFixed(2)}%` : 'N/A'}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Alert When APR Goes</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAlertType('above')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    alertType === 'above' ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ArrowUp className={`h-5 w-5 ${alertType === 'above' ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className={`font-medium ${alertType === 'above' ? 'text-green-400' : 'text-gray-300'}`}>Above</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Alert when APR rises</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAlertType('below')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    alertType === 'below' ? 'border-red-500 bg-red-500/10' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ArrowDown className={`h-5 w-5 ${alertType === 'below' ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className={`font-medium ${alertType === 'below' ? 'text-red-400' : 'text-gray-300'}`}>Below</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Alert when APR drops</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Threshold (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10000"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="e.g., 5.00"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">You&apos;ll be notified when the APR goes {alertType} this percentage</p>
            </div>

            {asset && platform && threshold && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-emerald-400 text-sm">
                  <strong>Preview:</strong> You&apos;ll receive a notification when <span className="font-semibold">{asset}</span> APR on{' '}
                  <span className="font-semibold">{platform}</span> goes{' '}
                  <span className={alertType === 'above' ? 'text-green-400' : 'text-red-400'}>
                    {alertType} {threshold}%
                  </span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !asset || !platform || !threshold}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Alert'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

