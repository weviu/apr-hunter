import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';
import { defineChain } from 'viem';

// Polygon Amoy Testnet
const amoy = defineChain({
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology/'] },
  },
  blockExplorers: {
    default: { name: 'Amoy Explorer', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'APR Hunter',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'default_project_id',
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia,
    amoy as any, // Polygon testnet
  ],
  ssr: true, // next.js server rendering
  wallets: [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        walletConnectWallet,
        coinbaseWallet,
      ],
    },
  ],
});
