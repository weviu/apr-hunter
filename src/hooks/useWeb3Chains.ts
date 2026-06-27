'use client';

import { useState, useCallback, useEffect } from 'react';
import { Web3Chain } from '@/types/web3';

export const SUPPORTED_CHAINS: Record<number, Web3Chain> = {
  1:        { id: 1,        name: 'Ethereum', rpcUrl: 'https://eth.llamarpc.com',       testnet: false },
  11155111: { id: 11155111, name: 'Sepolia',  rpcUrl: 'https://rpc.sepolia.org',         testnet: true  },
  137:      { id: 137,      name: 'Polygon',  rpcUrl: 'https://polygon-rpc.com',         testnet: false },
  42161:    { id: 42161,    name: 'Arbitrum', rpcUrl: 'https://arb1.arbitrum.io/rpc',    testnet: false },
  10:       { id: 10,       name: 'Optimism', rpcUrl: 'https://mainnet.optimism.io',     testnet: false },
};

const DEFAULT_CHAINS = [1, 137, 42161, 10];

interface UseWeb3ChainsOptions {
  includeTestnets?: boolean;
}

export function useWeb3Chains(options?: UseWeb3ChainsOptions) {
  const { includeTestnets = true } = options ?? {};

  const getDefaultChains = useCallback(() => {
    return includeTestnets ? DEFAULT_CHAINS : DEFAULT_CHAINS.filter((id) => !SUPPORTED_CHAINS[id]?.testnet);
  }, [includeTestnets]);

  const [selectedChainIds, setSelectedChainIds] = useState<number[]>(getDefaultChains());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('web3-selected-chains');
      if (stored) {
        const parsed = JSON.parse(stored) as number[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedChainIds(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('web3-selected-chains', JSON.stringify(selectedChainIds));
    } catch {
      // ignore
    }
  }, [selectedChainIds]);

  const toggleChain = useCallback((chainId: number) => {
    setSelectedChainIds((prev) =>
      prev.includes(chainId) ? prev.filter((id) => id !== chainId) : [...prev, chainId]
    );
  }, []);

  const selectChains = useCallback((chainIds: number[]) => {
    setSelectedChainIds(chainIds);
  }, []);

  const resetToDefaults = useCallback(() => {
    setSelectedChainIds(getDefaultChains());
  }, [getDefaultChains]);

  const availableChains = Object.values(SUPPORTED_CHAINS).filter(
    (c) => includeTestnets || !c.testnet
  );

  const selectedChains = selectedChainIds
    .map((id) => SUPPORTED_CHAINS[id])
    .filter(Boolean);

  return {
    selectedChainIds,
    selectedChains,
    availableChains,
    toggleChain,
    selectChains,
    resetToDefaults,
    isChainSelected: (chainId: number) => selectedChainIds.includes(chainId),
  };
}

export function getChainName(chainId: number): string {
  return SUPPORTED_CHAINS[chainId]?.name ?? `Chain ${chainId}`;
}
