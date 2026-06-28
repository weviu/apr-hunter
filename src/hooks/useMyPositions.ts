'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EnrichedPosition } from '@/types/portfolio';

interface Env<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AprProduct {
  product: string | null;
  apr: number;
  apy: number | null;
  syncedAt: string;
}

/** All open positions for the user, joined to their current live APR. Polls every 30s. */
export function useUserPositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const res = await api.get<Env<EnrichedPosition[]>>('/api/positions');
      return (res.data as Env<EnrichedPosition[]>).data ?? [];
    },
    refetchInterval: 30_000,
  });
}

/** USD prices for the given symbols (warm DB cache). Fails independently of positions. */
export function usePrices(symbols: string[]) {
  const key = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).sort();
  return useQuery({
    queryKey: ['prices', key],
    queryFn: async () => {
      if (key.length === 0) return {} as Record<string, number>;
      const res = await api.get<Env<Record<string, number>>>(
        `/api/prices?symbols=${key.join(',')}`,
      );
      return (res.data as Env<Record<string, number>>).data ?? {};
    },
    enabled: key.length > 0,
    refetchInterval: 60_000,
  });
}

/** Distinct earn products (with live APR) for an (asset, exchange) pair. */
export function useAprProducts(asset: string, exchange: string) {
  return useQuery({
    queryKey: ['apr', 'products', asset, exchange],
    queryFn: async () => {
      const res = await api.get<Env<AprProduct[]>>(
        `/api/apr/products?asset=${encodeURIComponent(asset)}&exchange=${encodeURIComponent(exchange)}`,
      );
      return (res.data as Env<AprProduct[]>).data ?? [];
    },
    enabled: !!asset && !!exchange,
  });
}

export interface DetectedAavePosition {
  asset: string;
  amount: number;
  apr: number;
  chainId: number;
  walletAddress: string;
  exchange: 'aave';
  product: string;
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      asset: string;
      exchange: string;
      product?: string | null;
      amount: number;
      apr?: number;
      protocol?: string | null;
      chainId?: number | null;
      walletAddress?: string | null;
    }) => {
      const res = await api.post<Env<EnrichedPosition>>('/api/positions', data);
      return (res.data as Env<EnrichedPosition>).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

/** Scan a wallet for Aave V3 supply positions (server-side, Sepolia). */
export function useScanAave() {
  return useMutation({
    mutationFn: async (address: string | undefined) => {
      const res = await api.post<Env<{ positions: DetectedAavePosition[]; usedDemo: boolean }>>(
        '/api/web3/scan-aave',
        { address },
      );
      return (res.data as Env<{ positions: DetectedAavePosition[]; usedDemo: boolean }>).data ?? {
        positions: [],
        usedDemo: false,
      };
    },
  });
}

export function useRemovePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (positionId: string) => {
      await api.delete(`/api/positions/${positionId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
