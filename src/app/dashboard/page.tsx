'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Bell,
  PieChart,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';

type Position = {
  _id: string;
  platform: string;
  asset: string;
  amount: number;
  entryApr: number;
  currentApr?: number;
  entryPrice?: number;
  currentPrice?: number;
  status?: string;
  notes?: string;
  createdAt: string;
  currentValue?: number;
  aprSource?: string;
  aprLastUpdated?: string;
  closedAt?: string;
};

type PortfolioStats = {
  totalValue: number;
  totalEarnings: number;
  positionCount: number;
  positions: Position[];
};

type Alert = {
  id: string;
  asset: string;
  platform: string;
  alertType: 'above' | 'below';
  threshold: number;
  isActive: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, token } = useAuth();
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token) {
      void fetchStats();
      void fetchAlerts();
    }
  }, [token]);

  const fetchStats = async () => {
    setLoadingStats(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // safety timeout
    try {
      const res = await fetch(`${API_BASE}/api/positions/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data ?? null);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      clearTimeout(timeout);
      setLoadingStats(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        } else if (Array.isArray(data)) {
          setAlerts(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const [pendingDelete, setPendingDelete] = useState<Position | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'value' | 'apr' | 'pl'>('value');
  const [search, setSearch] = useState('');

  const handleDeletePosition = async (positionId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/positions/${positionId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        setStats((prev) => {
          if (!prev) return prev;
          const positions = (prev.positions || []).filter((p) => p._id !== positionId);
          const totalValue = positions.reduce((sum, p) => {
            return typeof p.currentValue === 'number' ? sum + p.currentValue : sum;
          }, 0);
          return {
            ...prev,
            positions,
            positionCount: positions.length,
            totalValue,
          };
        });
        void fetchStats();
        setPendingDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete position:', error);
    } finally {
      setIsDeleting(false);
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

  const positions = stats?.positions || [];
  const filteredPositions = positions.filter((p) => {
    const status = (p.status || 'active').toLowerCase();
    const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesTerm =
      !term ||
      p.asset.toLowerCase().includes(term) ||
      p.platform.toLowerCase().includes(term);
    return matchesStatus && matchesTerm;
  });

  const getPL = (p: Position) => {
    const entryValue =
      typeof p.entryPrice === 'number' && typeof p.amount === 'number'
        ? p.entryPrice * p.amount
        : null;
    const currentValue =
      typeof p.currentValue === 'number'
        ? p.currentValue
        : entryValue;
    if (entryValue === null || currentValue === null) {
      return { value: 0, label: 'N/A' };
    }
    const diff = currentValue - entryValue;
    const sign = diff >= 0 ? '+' : '-';
    return { value: diff, label: `${sign}$${Math.abs(diff).toLocaleString()}` };
  };

  const getYields = (p: Position) => {
    const base =
      typeof p.currentValue === 'number'
        ? p.currentValue
        : typeof p.entryPrice === 'number'
          ? p.entryPrice * (p.amount || 0)
          : null;
    const apr = (p.currentApr ?? p.entryApr) || 0;
    if (base === null || base <= 0) {
      return { daily: null, monthly: null };
    }
    const daily = (apr / 100 / 365) * base;
    const monthly = daily * 30;
    return {
      daily: `$${daily.toFixed(2)}/day`,
      monthly: `$${monthly.toFixed(2)}/30d`,
    };
  };

  const sortedPositions = [...filteredPositions].sort((a, b) => {
    const valueA = typeof a.currentValue === 'number' ? a.currentValue : 0;
    const valueB = typeof b.currentValue === 'number' ? b.currentValue : 0;
    const aprA = (a.currentApr ?? a.entryApr) || 0;
    const aprB = (b.currentApr ?? b.entryApr) || 0;
    const plA = getPL(a).value;
    const plB = getPL(b).value;
    if (sortBy === 'value') return valueB - valueA;
    if (sortBy === 'apr') return aprB - aprA;
    return plB - plA;
  });

  const hasPositions = sortedPositions.length > 0;

  const getFreshness = (lastUpdated?: string) => {
    if (!lastUpdated) return { label: 'Unknown', dot: 'bg-gray-500', color: 'text-gray-500' };
    const updated = new Date(lastUpdated);
    const diffMinutes = Math.floor((Date.now() - updated.getTime()) / (1000 * 60));
    if (diffMinutes < 5) return { label: 'Live', dot: 'bg-green-500', color: 'text-green-400' };
    if (diffMinutes < 60) return { label: `${diffMinutes}m`, dot: 'bg-yellow-500', color: 'text-yellow-400' };
    if (diffMinutes < 1440) return { label: `${Math.floor(diffMinutes / 60)}h`, dot: 'bg-orange-500', color: 'text-orange-400' };
    return { label: `${Math.floor(diffMinutes / 1440)}d`, dot: 'bg-red-500', color: 'text-red-400' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome back, {user.name || user.email.split('@')[0]}!</h1>
          <p className="text-gray-400 mt-1">Track your staking positions and monitor your earnings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Portfolio</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ${loadingStats ? '...' : (stats?.totalValue?.toLocaleString?.() ?? '0.00')}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Wallet className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Est. Earnings</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ${loadingStats ? '...' : (stats?.totalEarnings?.toLocaleString?.() ?? '0.00')}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">Based on APR</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Positions</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {loadingStats ? '...' : (stats?.positionCount ?? 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <PieChart className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </div>

          <Link href="/dashboard/alerts" className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Alerts</p>
                <p className="text-2xl font-bold text-white mt-1">{alerts.filter((a) => a.isActive).length}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Bell className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">My Positions</h2>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-200"
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-200"
                      >
                        <option value="value">Value</option>
                        <option value="apr">APR</option>
                        <option value="pl">P/L</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Search:</span>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Asset or platform"
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-200 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Link href="/dashboard/positions/new" className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>Add Position</span>
                </Link>
              </div>

              <div className="p-6">
                {loadingStats ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto" />
                    <p className="text-gray-400 mt-4">Loading positions...</p>
                  </div>
                ) : hasPositions ? (
                  <div className="space-y-4">
                    {sortedPositions.map((position) => {
                      const pl = getPL(position);
                      const yields = getYields(position);
                      const status = (position.status || 'active').toLowerCase();
                      return (
                        <div key={position._id} className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-white">{position.asset.slice(0, 2)}</span>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-semibold text-white">
                                    {position.amount} {position.asset}
                                  </h3>
                                  <span className="text-xs px-2 py-0.5 bg-gray-600 rounded text-gray-300">{position.platform}</span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      status === 'closed'
                                        ? 'bg-gray-600 text-gray-300'
                                        : 'bg-emerald-500/10 text-emerald-300'
                                    }`}
                                  >
                                    {status === 'closed' ? 'Closed' : 'Active'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400">
                                  APR: {(position.currentApr ?? position.entryApr)?.toFixed(2)}%
                                  {typeof position.currentValue === 'number' && (
                                    <span className="ml-2">• Value: ${position.currentValue.toLocaleString()}</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                  <span className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${getFreshness(position.aprLastUpdated).dot}`} />
                                    <span className={getFreshness(position.aprLastUpdated).color}>
                                      {getFreshness(position.aprLastUpdated).label}
                                    </span>
                                  </span>
                                  <span>•</span>
                                  <span>Source: {position.aprSource || position.platform || 'N/A'}</span>
                                </p>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                                  <span className={pl.value >= 0 ? 'text-emerald-400' : 'text-red-400'}>P/L: {pl.label}</span>
                                  {yields.daily && <span>• Daily: {yields.daily}</span>}
                                  {yields.monthly && <span>• 30d: {yields.monthly}</span>}
                                  {position.closedAt && <span>• Closed: {new Date(position.closedAt).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setPendingDelete(position)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                title="Close position"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {position.notes && <p className="text-sm text-gray-500 mt-2 pl-14">{position.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wallet className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No positions yet</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">Add your staking positions to track your earnings and monitor APR changes.</p>
                    <Link href="/dashboard/positions/new" className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                      <Plus className="h-5 w-5" />
                      <span>Add Your First Position</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Alerts</h2>
                <Link href="/dashboard/alerts/new" className="flex items-center space-x-1 text-emerald-500 hover:text-emerald-400 text-sm">
                  <Plus className="h-4 w-4" />
                  <span>New Alert</span>
                </Link>
              </div>

              <div className="p-6">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="h-6 w-6 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-sm">No alerts set up yet</p>
                    <Link href="/dashboard/alerts/new" className="text-emerald-500 hover:text-emerald-400 text-sm mt-2 inline-block">
                      Create your first alert →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className={`p-3 bg-gray-700/50 rounded-lg ${!alert.isActive ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{alert.asset}</p>
                            <p className="text-xs text-gray-400">
                              {alert.alertType === 'above' ? '↑' : '↓'} {alert.threshold}% on {alert.platform}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              alert.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-600 text-gray-400'
                            }`}
                          >
                            {alert.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {alerts.length > 3 ? (
                      <Link href="/dashboard/alerts" className="block text-center text-sm text-emerald-500 hover:text-emerald-400 py-2">
                        View all {alerts.length} alerts →
                      </Link>
                    ) : (
                      <Link href="/dashboard/alerts" className="block text-center text-sm text-gray-500 hover:text-gray-400 py-2">
                        Manage alerts →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 mt-6 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/" className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
                  <span className="text-gray-300">Browse APR Rates</span>
                  <ArrowUpRight className="h-4 w-4 text-gray-500" />
                </Link>
                <Link href="/dashboard/positions/new" className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
                  <span className="text-gray-300">Add New Position</span>
                  <Plus className="h-4 w-4 text-gray-500" />
                </Link>
              </div>
            </div>

            {hasPositions && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 mt-6 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Portfolio by Asset</h3>
                <div className="space-y-3">
                  {(() => {
                    const assetMap = new Map<string, { amount: number; count: number }>();
                    positions.forEach((p) => {
                      const existing = assetMap.get(p.asset) || { amount: 0, count: 0 };
                      assetMap.set(p.asset, {
                        amount: existing.amount + (p.currentValue || 0),
                        count: existing.count + 1,
                      });
                    });
                    return Array.from(assetMap.entries()).map(([asset, data]) => (
                      <div key={asset} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{asset.slice(0, 2)}</span>
                          </div>
                          <span className="text-gray-300">{asset}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">${data.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">
                            {data.count} position{data.count > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isDeleting && setPendingDelete(null)} />
          <div className="relative z-10 w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-400">Close Position</p>
                  <h3 className="text-xl font-semibold text-white mt-1">
                    {pendingDelete.amount} {pendingDelete.asset}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Platform: <span className="text-white">{pendingDelete.platform}</span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                This will mark the position as <span className="text-red-400">closed</span>. You can add it again later if needed.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePosition(pendingDelete._id)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Closing...' : 'Close Position'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

