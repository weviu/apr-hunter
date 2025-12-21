'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider, getDefaultWallets, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, bsc, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import { AuthProvider } from '@/lib/auth';
import '@rainbow-me/rainbowkit/styles.css';

const chains = [mainnet, polygon, bsc, optimism, arbitrum, base, sepolia];

// Use RainbowKit helper to build a Wagmi config without manual providers.
const wagmiConfig = getDefaultConfig({
  appName: 'APR Hunter',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains,
  ssr: true,
});

function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} modalSize="compact">
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
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
