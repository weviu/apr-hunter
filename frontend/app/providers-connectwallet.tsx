'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createClient, configureChains } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { mainnet, polygon, bsc, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

// Configure chains and providers for wagmi v1
// This works without WalletConnect Project ID - perfect for ConnectWallet.network or direct connections
const { chains, provider } = configureChains(
  [mainnet, polygon, bsc, optimism, arbitrum, base, sepolia],
  [publicProvider()]
);

// Create wagmi client with injected connectors
const client = createClient({
  autoConnect: true,
  connectors: [
    new InjectedConnector({
      chains,
    }),
    new MetaMaskConnector({
      chains,
    }),
  ],
  provider,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider client={client}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

