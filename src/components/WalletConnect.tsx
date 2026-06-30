'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useMetaMask } from '@/lib/web3/useMetaMask';

const btnBase =
  'inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition';

function shortenAddress(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';
}

export function WalletConnect() {
  const { address, isConnected, isPending, isInstalled, connectMetaMask, disconnect } = useMetaMask();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  // Hold the space until mounted to avoid a hydration mismatch / layout shift.
  if (!mounted) return <div className="h-8 min-w-[136px]" aria-hidden />;

  if (!isConnected) {
    if (!isInstalled) {
      return (
        <div className="flex min-w-[136px] justify-end">
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} bg-accent text-accent-fg hover:bg-accent-hover`}
          >
            Install MetaMask
          </a>
        </div>
      );
    }
    return (
      <div className="flex min-w-[136px] justify-end">
        <button
          onClick={connectMetaMask}
          disabled={isPending}
          type="button"
          className={`${btnBase} bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50`}
        >
          {isPending ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative flex min-w-[136px] justify-end">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        type="button"
        aria-expanded={menuOpen}
        className={`${btnBase} gap-1.5 border border-hairline bg-surface text-fg hover:bg-surface-hover hover:border-hairline-strong`}
      >
        <span className="h-2 w-2 rounded-full bg-success" />
        {shortenAddress(address)}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-hairline bg-surface shadow-overlay">
          <button
            onClick={() => {
              disconnect();
              setMenuOpen(false);
            }}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-muted transition hover:bg-surface-hover hover:text-fg"
          >
            <LogOut className="h-4 w-4" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
