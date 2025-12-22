'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { mainnet, polygon, bsc, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import type { Chain } from 'viem/chains';

const chains = [mainnet, polygon, bsc, optimism, arbitrum, base, sepolia] as const satisfies readonly [
  Chain,
  ...Chain[]
];

const transports = Object.fromEntries(chains.map((chain) => [chain.id, http()])) as Record<
  number,
  ReturnType<typeof http>
>;

const client = createConfig({
  ssr: true,
  chains,
  transports,
  connectors: [
    injected({
      target: 'metaMask',
    }),
    metaMask(),
  ],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

