import { createConfig, http } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
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

/**
 * MetaMask-only wagmi config (no RainbowKit / WalletConnect).
 *
 * The injected connector targets the MetaMask browser extension directly, so
 * `connect()` opens MetaMask itself rather than a third-party modal.
 */
export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia, amoy],
  connectors: [injected({ target: 'metaMask' })],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
    [amoy.id]: http(),
  },
  ssr: true, // next.js server rendering
});
