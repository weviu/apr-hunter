'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Bell,
  PieChart,
  Plus,
  TrendingUp,
  Wallet,
  FolderPlus,
  Zap,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';
import { Web3PositionScanner } from '@/components/Web3PositionScanner';

type Portfolio = {
  _id: string;
  name: string;
  type: 'web2' | 'web3';
  totalValue?: number;
  totalPositions?: number;
  avgApr?: number;
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
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);
  const [web3ScannerOpen, setWeb3ScannerOpen] = useState(false);

  const fetchPortfolios = useCallback(async () => {
    setLoadingPortfolios(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${API_BASE}/api/portfolios`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });
      if (res.ok) {
        const response = await res.json();
        const portfolioList = Array.isArray(response) ? response : response.data?.portfolios ?? [];
        setPortfolios(portfolioList);
      }
    } catch (error) {
      console.error('Failed to fetch portfolios:', error);
    } finally {
      clearTimeout(timeout);
      setLoadingPortfolios(false);
    }
  }, [token]);

  const fetchAlerts = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token) {
      void fetchPortfolios();
      void fetchAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const totalValue = portfolios.reduce((sum, p) => sum + (p.totalValue ?? 0), 0);
  const totalPositions = portfolios.reduce((sum, p) => sum + (p.totalPositions ?? 0), 0);


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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back, {user.name || user.email.split('@')[0]}!</h1>
              <p className="text-gray-400 mt-1">Manage your portfolios and track your earnings.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ${loadingPortfolios ? '...' : totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                <p className="text-gray-400 text-sm">Total Positions</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {loadingPortfolios ? '...' : totalPositions}
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
                <p className="text-gray-400 text-sm">Active Portfolios</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {loadingPortfolios ? '...' : portfolios.length}
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-500" />
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
            {/* Web3 Position Scanner Card */}
            <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-xl border border-blue-700/50 mb-8 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Web3 Position Scanner</h2>
                  </div>
                  <p className="text-sm text-gray-300">Scan your wallet to detect and import Web3 positions from Yearn, Aave, and more</p>
                </div>
                <button
                  onClick={() => setWeb3ScannerOpen(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  <Zap size={18} />
                  Scan Wallet
                </button>
              </div>
            </div>

            <Web3PositionScanner
              isOpen={web3ScannerOpen}
              onClose={() => setWeb3ScannerOpen(false)}
            />
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold text-white">My Portfolios</h2>
                  <p className="text-sm text-gray-400 mt-1">Click on a portfolio to manage its positions</p>
                </div>
                <Link 
                  href="/dashboard/portfolios"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  <FolderPlus size={18} />
                  New Portfolio
                </Link>
              </div>

              <div className="p-6">
                {loadingPortfolios ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto" />
                    <p className="text-gray-400 mt-4">Loading portfolios...</p>
                  </div>
                ) : portfolios.length > 0 ? (
                  <div className="space-y-4">
                    {portfolios.map((portfolio) => (
                      <Link
                        key={portfolio._id}
                        href={`/dashboard/portfolios/${portfolio._id}`}
                        className="block bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors border border-gray-600 hover:border-gray-500"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-white">{portfolio.name}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                portfolio.type === 'web3' 
                                  ? 'bg-blue-500/20 text-blue-300' 
                                  : 'bg-gray-600 text-gray-300'
                              }`}>
                                {portfolio.type === 'web3' ? 'Web3' : 'Web2'}
                              </span>
                            </div>
                            <div className="flex gap-6 mt-2 text-sm text-gray-400">
                              <span>Positions: <span className="text-white font-medium">{portfolio.totalPositions ?? 0}</span></span>
                              <span>Value: <span className="text-white font-medium">${(portfolio.totalValue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
                              {portfolio.avgApr !== undefined && (
                                <span>Avg APR: <span className="text-emerald-400 font-medium">{portfolio.avgApr.toFixed(2)}%</span></span>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-500">
                            <ArrowUpRight className="h-5 w-5" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wallet className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No portfolios yet</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">Create your first portfolio to start managing your investments and tracking your earnings.</p>
                    <Link href="/dashboard/portfolios" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                      <FolderPlus size={20} />
                      <span>Create Your First Portfolio</span>
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
                <Link href="/dashboard/portfolios" className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
                  <span className="text-gray-300">Manage Portfolios</span>
                  <ArrowUpRight className="h-4 w-4 text-gray-500" />
                </Link>
                <Link href="/" className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
                  <span className="text-gray-300">Browse APR Rates</span>
                  <ArrowUpRight className="h-4 w-4 text-gray-500" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


