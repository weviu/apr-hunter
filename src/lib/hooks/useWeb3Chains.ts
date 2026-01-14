/**
 * Hook for managing Web3 chains selection and preferences
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Web3Chain } from '@/types/web3';

// Supported chains configuration
export const SUPPORTED_CHAINS: Record<number, Web3Chain> = {
  1: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    testnet: false,
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    testnet: true,
  },
  137: {
    id: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    testnet: false,
  },
  42161: {
    id: 42161,
    name: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    testnet: false,
  },
  10: {
    id: 10,
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    testnet: false,
  },
  35935: {
    id: 35935,
    name: 'TractSafe',
    rpcUrl: 'https://tapi.tractsafe.com/',
    testnet: true,
  },
};

/**
 * Default chains for MVP (mainnet only)
 */
const DEFAULT_CHAINS_MVP = [1];

/**
 * Default chains for full-featured (all mainnets)
 */
const DEFAULT_CHAINS_FULL = [1, 137, 42161, 10, 35935];

interface UseWeb3ChainsOptions {
  fullFeatured?: boolean;
  includeTestnets?: boolean;
}

/**
 * Hook to manage Web3 chains selection
 */
export function useWeb3Chains(
  options?: UseWeb3ChainsOptions
) {
  const {
    fullFeatured = true,
    includeTestnets = true,
  } = options || {};

  // Get default chains based on configuration
  const getDefaultChains = useCallback(() => {
    let chains = fullFeatured ? DEFAULT_CHAINS_FULL : DEFAULT_CHAINS_MVP;
    
    if (!includeTestnets) {
      chains = chains.filter(chainId => !SUPPORTED_CHAINS[chainId].testnet);
    }
    
    return chains;
  }, [fullFeatured, includeTestnets]);

  const [selectedChainIds, setSelectedChainIds] = useState<number[]>(
    getDefaultChains()
  );

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('web3-selected-chains');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          queueMicrotask(() => setSelectedChainIds(parsed));
        }
      }
    } catch (error) {
      console.warn('Failed to load saved chains:', error);
    }
  }, []);

  // Save to localStorage when selected chains change
  useEffect(() => {
    try {
      localStorage.setItem('web3-selected-chains', JSON.stringify(selectedChainIds));
    } catch (error) {
      console.warn('Failed to save chains:', error);
    }
  }, [selectedChainIds]);

  const toggleChain = useCallback((chainId: number) => {
    setSelectedChainIds((prev) => {
      if (prev.includes(chainId)) {
        return prev.filter((id) => id !== chainId);
      }
      return [...prev, chainId];
    });
  }, []);

  const selectChains = useCallback((chainIds: number[]) => {
    setSelectedChainIds(chainIds);
  }, []);

  const resetToDefaults = useCallback(() => {
    setSelectedChainIds(getDefaultChains());
  }, [getDefaultChains]);

  const getSelectedChains = useCallback(() => {
    return selectedChainIds
      .map((id) => SUPPORTED_CHAINS[id])
      .filter(Boolean);
  }, [selectedChainIds]);

  const getAvailableChains = useCallback(() => {
    return Object.values(SUPPORTED_CHAINS).filter((chain) => {
      if (!includeTestnets && chain.testnet) return false;
      return true;
    });
  }, [includeTestnets]);

  return {
    selectedChainIds,
    selectedChains: getSelectedChains(),
    availableChains: getAvailableChains(),
    toggleChain,
    selectChains,
    resetToDefaults,
    isChainSelected: (chainId: number) => selectedChainIds.includes(chainId),
  };
}

/**
 * Get chain name from ID
 */
export function getChainName(chainId: number): string {
  return SUPPORTED_CHAINS[chainId]?.name || `Chain ${chainId}`;
}

/**
 * Get chain by ID
 */
export function getChain(chainId: number): Web3Chain | undefined {
  return SUPPORTED_CHAINS[chainId];
}

/**
 * Get all mainnet chains
 */
export function getMainnetChains(): Web3Chain[] {
  return Object.values(SUPPORTED_CHAINS).filter((chain) => !chain.testnet);
}

/**
 * Get all testnet chains
 */
export function getTestnetChains(): Web3Chain[] {
  return Object.values(SUPPORTED_CHAINS).filter((chain) => chain.testnet);
}
