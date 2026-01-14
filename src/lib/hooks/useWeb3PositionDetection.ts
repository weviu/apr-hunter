/**
 * React Query hook for Web3 position detection
 * Handles fetching detected positions from API
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DetectedWeb3Position, Web3DetectionResult } from '@/types/web3';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

interface UseWeb3PositionDetectionOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface DetectPositionsParams {
  walletAddress: string;
  chainIds: number[];
}

/**
 * Fetch detected Web3 positions
 */
async function detectWeb3Positions(
  params: DetectPositionsParams,
  token?: string,
  signal?: AbortSignal
): Promise<DetectedWeb3Position[]> {
  const response = await fetch(`${API_BASE}/api/web3/detect-positions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to detect positions');
  }

  const result: Web3DetectionResult = await response.json();
  if (!result.success || !result.data) {
    throw new Error('No positions detected');
  }

  return result.data.positions;
}

/**
 * Hook to detect Web3 positions
 */
export function useWeb3PositionDetection(
  walletAddress?: string,
  chainIds?: number[],
  token?: string,
  options?: UseWeb3PositionDetectionOptions
) {
  const {
    enabled = !!walletAddress && !!chainIds,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
  } = options || {};

  return useQuery({
    queryKey: ['web3-positions', walletAddress, chainIds],
    queryFn: () => {
      if (!walletAddress || !chainIds) {
        return Promise.reject(new Error('Missing wallet address or chain IDs'));
      }
      return detectWeb3Positions({ walletAddress, chainIds }, token);
    },
    enabled,
    staleTime,
    gcTime: cacheTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Mutation hook to detect positions on demand
 */
export function useDetectWeb3PositionsMutation(token?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DetectPositionsParams) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const result = await detectWeb3Positions(params, token, controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('[Web3PositionDetection] Error detecting positions:', error);
        throw error;
      }
    },
    onSuccess: (positions, variables) => {
      console.log('[Web3PositionDetection] Success:', positions);
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ['web3-positions', variables.walletAddress],
      });
    },
    onError: (error: Error) => {
      console.error('[Web3PositionDetection] Mutation error:', error.message);
    },
  });
}

/**
 * Hook to periodically refresh positions
 */
export function useAutoRefreshPositions(
  walletAddress?: string,
  chainIds?: number[],
  token?: string,
  intervalMs: number = 5 * 60 * 1000 // 5 minutes
) {
  useQuery({
    queryKey: ['web3-positions-auto-refresh', walletAddress, chainIds],
    queryFn: async () => {
      if (!walletAddress || !chainIds) return null;
      return detectWeb3Positions({ walletAddress, chainIds }, token);
    },
    enabled: !!walletAddress && !!chainIds,
    refetchInterval: intervalMs,
    staleTime: intervalMs - 1000,
  });
}

/**
 * Hook to manually trigger refresh
 */
export function useManualRefreshPositions(token?: string) {
  const queryClient = useQueryClient();

  return async (walletAddress: string, chainIds: number[]) => {
    try {
      const positions = await detectWeb3Positions(
        { walletAddress, chainIds },
        token
      );
      queryClient.setQueryData(
        ['web3-positions', walletAddress, chainIds],
        positions
      );
      return positions;
    } catch (error) {
      console.error('Failed to refresh positions:', error);
      throw error;
    }
  };
}
