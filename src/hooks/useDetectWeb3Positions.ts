'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContracts } from 'wagmi';
import { Position } from '@/types/portfolio';

interface DetectedPosition extends Partial<Omit<Position, 'id' | 'portfolioId' | 'userId' | 'createdAt' | 'updatedAt'>> {
  symbol: string;
  asset: string;
  protocol: string | null;
  amount: number;
  aprAtEntry: number;
}

const LIDO_STETH_ADDRESS = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84';
const LIDO_STETH_SEPOLIA = '0x6320cD32aA674d2898a289f694e6481B633BCa7f';

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function getStEthAddress(chainId?: number) {
  if (chainId === 11155111) return LIDO_STETH_SEPOLIA;
  return LIDO_STETH_ADDRESS;
}

export function useDetectWeb3Positions() {
  const { address, chainId, isConnected } = useAccount();

  const contracts = address
    ? [
        {
          address: getStEthAddress(chainId) as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf' as const,
          args: [address] as const,
          chainId: chainId ?? 1,
        },
      ]
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ReadContractsConfig = Parameters<typeof useReadContracts>[0] & { contracts: any[] };
  const readContractsConfig: ReadContractsConfig = {
    contracts: contracts as ReadContractsConfig['contracts'],
    query: { enabled: isConnected && !!address && contracts.length > 0 },
  };

  const { data: contractResults, isLoading: contractsLoading } = useReadContracts(readContractsConfig);

  return useQuery({
    queryKey: ['web3-positions-local', address, chainId],
    queryFn: async () => {
      if (!address || !isConnected) return [];

      const positions: DetectedPosition[] = [];

      const balanceResult = (contractResults as Array<{ status: string; result: unknown }> | undefined)?.[0];
      if (
        balanceResult?.status === 'success' &&
        typeof balanceResult.result === 'bigint'
      ) {
        const balance = Number(balanceResult.result) / 1e18;
        if (balance > 0) {
          positions.push({
            symbol: 'stETH',
            asset: 'ETH',
            protocol: 'lido',
            chainId: chainId ?? 1,
            walletAddress: address,
            amount: balance,
            aprAtEntry: 0.032, // ~3.2% default Lido APR (decimal)
            stakedAt: new Date().toISOString(),
          });
        }
      }

      return positions;
    },
    enabled: isConnected && !!address && !contractsLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
