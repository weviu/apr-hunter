'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DetectedWeb3Position, Web3DetectionResult } from '@/types/web3';

interface DetectPositionsParams {
  walletAddress: string;
  chainIds: number[];
}

async function detectWeb3Positions(
  params: DetectPositionsParams,
  signal?: AbortSignal
): Promise<DetectedWeb3Position[]> {
  const response = await fetch('/api/web3/detect-positions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as { error?: string }).error ?? 'Failed to detect positions');
  }

  const result = (await response.json()) as Web3DetectionResult;
  if (!result.success || !result.data) {
    throw new Error('No positions detected');
  }

  return result.data.positions;
}

export function useWeb3PositionDetection(
  walletAddress?: string,
  chainIds?: number[],
  options?: { enabled?: boolean; staleTime?: number }
) {
  const { enabled = !!walletAddress && !!chainIds, staleTime = 5 * 60 * 1000 } = options ?? {};

  return useQuery({
    queryKey: ['web3-positions', walletAddress, chainIds],
    queryFn: () => {
      if (!walletAddress || !chainIds) return Promise.reject(new Error('Missing params'));
      return detectWeb3Positions({ walletAddress, chainIds });
    },
    enabled,
    staleTime,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

export function useDetectWeb3PositionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DetectPositionsParams) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);
      try {
        const result = await detectWeb3Positions(params, controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    onSuccess: (_positions, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['web3-positions', variables.walletAddress],
      });
    },
  });
}

export function useAutoRefreshPositions(
  walletAddress?: string,
  chainIds?: number[],
  intervalMs = 5 * 60 * 1000
) {
  useQuery({
    queryKey: ['web3-positions-auto-refresh', walletAddress, chainIds],
    queryFn: async () => {
      if (!walletAddress || !chainIds) return null;
      return detectWeb3Positions({ walletAddress, chainIds });
    },
    enabled: !!walletAddress && !!chainIds,
    refetchInterval: intervalMs,
    staleTime: intervalMs - 1000,
  });
}
