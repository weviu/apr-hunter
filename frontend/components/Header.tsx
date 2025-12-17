'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { TrendingUp, User, LogOut, LayoutDashboard } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export function Header() {
  const { user, isLoading, logout } = useAuth();

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
          <nav className="flex items-center space-x-6">
            <Link
              href="/assets"
              className="text-gray-300 hover:text-emerald-400 transition-colors"
            >
              Assets
            </Link>
            <Link
              href="/platforms"
              className="text-gray-300 hover:text-emerald-400 transition-colors"
            >
              Platforms
            </Link>

            {/* Auth Section */}
            {isLoading ? (
              <div className="w-20 h-8 bg-gray-700 rounded animate-pulse" />
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 text-gray-300 hover:text-emerald-400 transition-colors"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center space-x-3 pl-4 border-l border-gray-700">
                  <NotificationBell />
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-300 text-sm hidden sm:block">
                      {user.name || user.email.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
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
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}



