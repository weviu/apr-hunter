'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const btnBase =
  'inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition';

export function WalletConnect() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      div[style*="background-color: rgb(255, 217, 90)"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    // Reserve a stable minimum width so the nav doesn't reflow while RainbowKit
    // (re)initialises on navigation — the cause of the "buttons jump right" flicker.
    <div className="flex min-w-[136px] justify-end">
      <ConnectButton.Custom>
        {(renderProps) => {
          const { account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted } = renderProps;
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === 'authenticated');

          // Hold the space (no visible content) until mounted to avoid layout shift.
          if (!mounted) {
            return <div className="h-8" aria-hidden />;
          }

          if (!connected) {
            return (
              <button
                onClick={openConnectModal}
                type="button"
                className={`${btnBase} bg-accent text-accent-fg hover:bg-accent-hover`}
              >
                Connect Wallet
              </button>
            );
          }

          if (chain.unsupported) {
            return (
              <button
                onClick={openChainModal}
                type="button"
                className={`${btnBase} bg-danger text-white hover:opacity-90`}
              >
                Wrong Network
              </button>
            );
          }

          return (
            <div className="flex gap-2">
              <button
                onClick={openChainModal}
                type="button"
                className={`${btnBase} gap-2 border border-hairline bg-surface text-fg hover:bg-surface-hover hover:border-hairline-strong`}
              >
                {chain.hasIcon && (
                  <span
                    className="h-3 w-3 overflow-hidden rounded-full"
                    style={{ background: chain.iconBackground }}
                  >
                    {chain.iconUrl && (
                      <Image alt={chain.name ?? 'Chain icon'} src={chain.iconUrl} width={12} height={12} />
                    )}
                  </span>
                )}
                {chain.name}
              </button>
              <button
                onClick={openAccountModal}
                type="button"
                className={`${btnBase} border border-hairline bg-surface text-fg hover:bg-surface-hover hover:border-hairline-strong`}
              >
                {account.displayName}
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
