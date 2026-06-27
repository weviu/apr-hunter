'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Bell, PieChart, Plus, TrendingUp, Wallet, FolderPlus, Zap } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';
import { usePortfolios } from '@/hooks/usePortfolio';
import { useAlerts } from '@/hooks/useAlerts';
import { Web3PositionScanner } from '@/components/Web3PositionScanner';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [web3ScannerOpen, setWeb3ScannerOpen] = useState(false);

  const { data: portfolios = [], isLoading: loadingPortfolios } = usePortfolios({ enabled: !!user });
  const { data: alertsData } = useAlerts();
  const alerts = alertsData ?? [];

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const totalPositions = portfolios.reduce((sum, p) => sum + ((p as { totalPositions?: number }).totalPositions ?? 0), 0);
  const activeAlerts = alerts.filter((a) => (a as { isActive?: boolean }).isActive).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user.name ?? user.email.split('@')[0]}!
          </h1>
          <p className="text-gray-400 mt-1">Manage your portfolios and track your earnings.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                <p className="text-2xl font-bold text-white mt-1">{activeAlerts}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Bell className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Web3 Scanner Card */}
            <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-xl border border-blue-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Web3 Position Scanner</h2>
                  </div>
                  <p className="text-sm text-gray-300">
                    Scan your wallet to detect and import Web3 positions from Yearn, Aave, and more
                  </p>
                </div>
                <button
                  onClick={() => setWeb3ScannerOpen(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition whitespace-nowrap"
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

            {/* Portfolios */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold text-white">My Portfolios</h2>
                  <p className="text-sm text-gray-400 mt-1">Click on a portfolio to manage positions</p>
                </div>
                <Link
                  href="/dashboard/portfolios"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg font-medium transition whitespace-nowrap"
                >
                  <FolderPlus size={18} />
                  New Portfolio
                </Link>
              </div>

              <div className="p-6">
                {loadingPortfolios ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-700 mx-auto" />
                    <p className="text-gray-400 mt-4">Loading portfolios...</p>
                  </div>
                ) : portfolios.length > 0 ? (
                  <div className="space-y-4">
                    {portfolios.map((portfolio) => (
                      <Link
                        key={portfolio.id}
                        href={`/dashboard/portfolios/${portfolio.id}`}
                        className="block bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors border border-gray-600 hover:border-gray-500"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{portfolio.name}</h3>
                            {portfolio.description && (
                              <p className="text-sm text-gray-400 mt-0.5 truncate max-w-xs">{portfolio.description}</p>
                            )}
                          </div>
                          <ArrowUpRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
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
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                      Create your first portfolio to start managing your investments.
                    </p>
                    <Link
                      href="/dashboard/portfolios"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition"
                    >
                      <FolderPlus size={20} />
                      Create Your First Portfolio
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/dashboard/portfolios" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition text-gray-300 hover:text-white">
                  <FolderPlus className="h-5 w-5 text-blue-700" />
                  Portfolios
                </Link>
                <Link href="/dashboard/alerts" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition text-gray-300 hover:text-white">
                  <Bell className="h-5 w-5 text-yellow-500" />
                  Alerts
                </Link>
                <Link href="/dashboard/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition text-gray-300 hover:text-white">
                  <Plus className="h-5 w-5 text-blue-500" />
                  API Keys
                </Link>
                <Link href="/#opportunities" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition text-gray-300 hover:text-white">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  Top APR Rates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
