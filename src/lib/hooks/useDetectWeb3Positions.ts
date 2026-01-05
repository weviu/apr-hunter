'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContracts } from 'wagmi';
import { Position } from '@/types/portfolio';

interface DetectedPosition extends Omit<Position, '_id' | 'portfolioId' | 'userId' | 'createdAt' | 'updatedAt'> {
  _id?: never;
  portfolioId?: never;
  userId?: never;
  createdAt?: never;
  updatedAt?: never;
}

// Contract addresses and ABIs
const LIDO_STETH_ADDRESS = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84';
const LIDO_STETH_SEPOLIA = '0x6320cD32aA674d2898a289f694e6481B633BCa7f'; // Sepolia testnet

// Common ERC20 token addresses on Polygon Amoy
const POLYGON_AMOY_USDC = '0x41e94eb019c0762f9bfcf9fb1e58725bab9f2d0b';

const AAVE_V2_POOL_ADDRESS = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7a9';

// Get contract address by chain
function getContractAddress(chainId: number | undefined, contractType: 'steth' | 'usdc') {
  if (contractType === 'steth') {
    // Sepolia testnet
    if (chainId === 11155111) return LIDO_STETH_SEPOLIA;
    // Mainnet and others
    return LIDO_STETH_ADDRESS;
  }
  if (contractType === 'usdc') {
    // Polygon Amoy testnet
    if (chainId === 80002) return POLYGON_AMOY_USDC;
    // Mainnet USDC
    return '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  }
  return '';
}

// Minimal ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// Known token configurations
const KNOWN_TOKENS = {
  ethereum: {
    ETH: { symbol: 'ETH', decimals: 18 },
    stETH: {
      symbol: 'stETH',
      address: LIDO_STETH_ADDRESS,
      decimals: 18,
      platform: 'Lido',
      asset: 'Ethereum',
      chain: 'Ethereum',
      apr: 3.2, // Default Lido APR - can be updated from registry
    },
    USDC: {
      symbol: 'USDC',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimals: 6,
      platform: 'Web3',
      asset: 'USD Coin',
      chain: 'Ethereum',
    },
    DAI: {
      symbol: 'DAI',
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      decimals: 18,
      platform: 'Web3',
      asset: 'Dai Stablecoin',
      chain: 'Ethereum',
    },
  },
};

/**
 * Hook to detect Web3 positions from connected wallet
 * Currently supports: Lido stETH
 * Planned: Aave, Curve, Yearn
 */
export function useDetectWeb3Positions() {
  const { address, chainId, isConnected } = useAccount();

  // Build contracts array for Wagmi's useReadContracts
  // For Polygon Amoy: detect MATIC via USDC contract (as placeholder)
  // For other chains: detect stETH
  const isPolygonAmoy = chainId === 80002;
  const contractAddress = isPolygonAmoy
    ? getContractAddress(chainId, 'usdc')
    : getContractAddress(chainId, 'steth');

  const contracts = address ? [
    {
      address: contractAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
      chainId: chainId || 1,
    },
  ] : [];

  const { data: contractResults, isLoading: contractsLoading } = useReadContracts({
    contracts: contracts.length > 0 ? (contracts as any) : undefined,
    query: { enabled: isConnected && !!address },
  });

  return useQuery({
    queryKey: ['web3-positions', address, chainId],
    queryFn: async () => {
      if (!address || !isConnected) return [];

      const positions: DetectedPosition[] = [];

      // Process detected balances
      if (contractResults && contractResults.length > 0) {
        const balanceResult = contractResults[0];

        if (
          balanceResult &&
          balanceResult.status === 'success' &&
          balanceResult.result &&
          typeof balanceResult.result === 'bigint'
        ) {
          const balance = Number(balanceResult.result) / 1e18;

          // Skip if balance is 0
          if (balance === 0) return positions;

          // Polygon Amoy: Show MATIC balance
          if (isPolygonAmoy) {
            positions.push({
              symbol: 'MATIC',
              asset: 'Polygon',
              platform: 'Polygon Network',
              platformType: 'native',
              chain: 'Polygon Amoy',
              amount: balance,
              apr: 0, // MATIC doesn't earn APR on mainnet
              isActive: true,
              source: 'web3-detection',
            });
          } else {
            // Ethereum: Show stETH balance
            positions.push({
              symbol: 'stETH',
              asset: 'Ethereum',
              platform: 'Lido',
              platformType: 'defi',
              chain: 'Ethereum',
              amount: balance,
              apr: 3.2, // Default Lido APR
              isActive: true,
              source: 'web3-detection',
            });
          }
        }
      }

      // TODO: Add more protocols
      // - Aave (aUSDC, aDAI, etc.)
      // - Curve LP tokens
      // - Yearn vaults
      // - Other staking positions

      return positions;
    },
    enabled: isConnected && !!address && !contractsLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get all known token configurations for a chain
 */
export function getKnownTokens(chainName: string = 'ethereum') {
  return KNOWN_TOKENS[chainName as keyof typeof KNOWN_TOKENS] || KNOWN_TOKENS.ethereum;
}

/**
 * Helper to format token balance (accounting for decimals)
 */
export function formatTokenBalance(balance: bigint, decimals: number): number {
  return Number(balance) / Math.pow(10, decimals);
}
