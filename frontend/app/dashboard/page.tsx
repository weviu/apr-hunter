'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { 
  Wallet, 
  TrendingUp, 
  Plus, 
  Bell, 
  PieChart,
  ArrowUpRight,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface Position {
  _id: string;
  platform: string;
  asset: string;
  amount: number;
  entryApr: number;
  currentApr?: number;
  entryPrice?: number;
  currentPrice?: number;
  status: string;
  notes?: string;
  createdAt: string;
  currentValue?: number;
}

interface PortfolioStats {
  totalValue: number;
  totalEarnings: number;
  positionCount: number;
  positions: Position[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, token } = useAuth();
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch portfolio stats
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/positions/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to close this position?')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/positions/${positionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchStats(); // Refresh
      }
    } catch (error) {
      console.error('Failed to delete position:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const positions = stats?.positions || [];
  const hasPositions = positions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user.name || user.email.split('@')[0]}!
          </h1>
          <p className="text-gray-400 mt-1">
            Track your staking positions and monitor your earnings.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Portfolio</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ${loadingStats ? '...' : (stats?.totalValue.toLocaleString() || '0.00')}
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
                  ${loadingStats ? '...' : (stats?.totalEarnings.toLocaleString() || '0.00')}
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
                  {loadingStats ? '...' : (stats?.positionCount || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <PieChart className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Alerts</p>
                <p className="text-2xl font-bold text-white mt-1">0</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Bell className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Positions Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">My Positions</h2>
                <Link
                  href="/dashboard/positions/new"
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Position</span>
                </Link>
              </div>
              
              <div className="p-6">
                {loadingStats ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading positions...</p>
                  </div>
                ) : hasPositions ? (
                  <div className="space-y-4">
                    {positions.map((position) => (
                      <div
                        key={position._id}
                        className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-white">
                                {position.asset.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-white">
                                  {position.amount} {position.asset}
                                </h3>
                                <span className="text-xs px-2 py-0.5 bg-gray-600 rounded text-gray-300">
                                  {position.platform}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">
                                APR: {position.currentApr || position.entryApr}%
                                {position.currentValue && (
                                  <span className="ml-2">
                                    • Value: ${position.currentValue.toLocaleString()}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDeletePosition(position._id)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Close position"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {position.notes && (
                          <p className="text-sm text-gray-500 mt-2 pl-14">
                            {position.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wallet className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No positions yet</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                      Add your staking positions to track your earnings and monitor APR changes.
                    </p>
                    <Link
                      href="/dashboard/positions/new"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add Your First Position</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Alerts Section */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Alerts</h2>
                <Link
                  href="/dashboard/alerts/new"
                  className="flex items-center space-x-1 text-emerald-500 hover:text-emerald-400 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Alert</span>
                </Link>
              </div>
              
              <div className="p-6">
                {/* Empty State */}
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="h-6 w-6 text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    No alerts set up yet
                  </p>
                  <Link
                    href="/dashboard/alerts/new"
                    className="text-emerald-500 hover:text-emerald-400 text-sm mt-2 inline-block"
                  >
                    Create your first alert →
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 mt-6 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/"
                  className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-gray-300">Browse APR Rates</span>
                  <ArrowUpRight className="h-4 w-4 text-gray-500" />
                </Link>
                <Link
                  href="/dashboard/positions/new"
                  className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-gray-300">Add New Position</span>
                  <Plus className="h-4 w-4 text-gray-500" />
                </Link>
              </div>
            </div>

            {/* Portfolio Breakdown */}
            {hasPositions && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 mt-6 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Portfolio by Asset</h3>
                <div className="space-y-3">
                  {(() => {
                    const assetMap = new Map<string, { amount: number; count: number }>();
                    positions.forEach(p => {
                      const existing = assetMap.get(p.asset) || { amount: 0, count: 0 };
                      assetMap.set(p.asset, {
                        amount: existing.amount + (p.currentValue || 0),
                        count: existing.count + 1
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
                          <p className="text-xs text-gray-500">{data.count} position{data.count > 1 ? 's' : ''}</p>
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
    </div>
  );
}
