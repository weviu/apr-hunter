'use client';

import Link from 'next/link';
import { TrendingUp, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { NotificationBell } from './notification-bell';
import { WalletConnect } from './WalletConnect';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const onSignOut = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            <h1 className="text-2xl font-bold text-white">APR Hunter</h1>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/#opportunities"
              className="text-gray-300 hover:text-emerald-400 transition-colors"
            >
              Opportunities
            </Link>
            <Link
              href="/#compare"
              className="text-gray-300 hover:text-emerald-400 transition-colors"
            >
              Compare
            </Link>
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-emerald-400 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/portfolios"
                  className="text-gray-300 hover:text-emerald-400 transition-colors"
                >
                  Portfolios
                </Link>
              </>
            )}
            <div className="hidden sm:flex items-center space-x-3">
              {user ? (
                <>
                  <NotificationBell />
                  <Link
                    href="/dashboard/settings"
                    className="relative p-2 text-gray-400 hover:text-white transition-colors"
                    title="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                  <div className="border-l border-gray-700 pl-3">
                    <WalletConnect />
                  </div>
                  <button
                    onClick={onSignOut}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
