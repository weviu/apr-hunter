'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, bsc, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import type { Chain } from 'viem/chains';
import { AuthProvider } from '@/lib/auth';
import '@rainbow-me/rainbowkit/styles.css';

const chains = [mainnet, polygon, bsc, optimism, arbitrum, base, sepolia] as const satisfies readonly [
  Chain,
  ...Chain[]
];

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Only build the Wagmi config when a WalletConnect Project ID is present.
const wagmiConfig = projectId
  ? getDefaultConfig({
      appName: 'APR Hunter',
      projectId,
      chains,
      ssr: true,
    })
  : null;

function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!wagmiConfig) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[APR Hunter] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect features are disabled.'
      );
    }

    return <>{children}</>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider modalSize="compact">{children}</RainbowKitProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchInterval: 30 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Web3Provider>{children}</Web3Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
