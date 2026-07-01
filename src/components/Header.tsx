'use client';

import Link from 'next/link';
import { TrendingUp, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { NotificationBell } from './notification-bell';
import { WalletConnect } from './WalletConnect';
import { Button } from '@/components/ui';

const navLinkClass =
  'rounded-md px-2 py-1 text-fg-muted transition hover:bg-surface-hover hover:text-fg';

export function Header() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const onSignOut = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-accent" />
            <span className="text-lg font-semibold tracking-tight text-fg">APR Hunter</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/#opportunities" className={navLinkClass}>
              Opportunities
            </Link>
            <Link href="/#compare" className={navLinkClass}>
              Compare
            </Link>
            <Link href="/#signals" className={navLinkClass}>
              Signals
            </Link>
            {!isLoading && user && (
              <Link href="/dashboard" className={navLinkClass}>
                My Positions
              </Link>
            )}

            <div className="ml-2 hidden items-center gap-2 sm:flex">
              {isLoading ? (
                // Avoid flashing the logged-out (Sign In/Sign Up) state before
                // the session check resolves on reload.
                <div className="h-8" aria-hidden />
              ) : user ? (
                <>
                  <NotificationBell />
                  <Link
                    href="/dashboard/settings"
                    className="rounded-md p-2 text-fg-faint transition hover:bg-surface-hover hover:text-fg"
                    title="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                  <div className="border-l border-hairline pl-2">
                    <WalletConnect />
                  </div>
                  <Button variant="secondary" size="sm" onClick={onSignOut} loadingText="Signing out…">
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className={navLinkClass}>
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
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
