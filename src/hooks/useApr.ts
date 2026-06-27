'use client';

import { useQuery } from '@tanstack/react-query';
import { AprSnapshot, AprTrendResult } from '@/types/apr';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export function useTopRates(limit = 10) {
  return useQuery({
    queryKey: ['apr', 'top', limit],
    queryFn: async () => {
      const res = await fetch(`/api/apr/top?limit=${limit}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiEnvelope<AprSnapshot[]>;
      return json.data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useAprRates(exchange?: string, asset?: string) {
  return useQuery({
    queryKey: ['apr', 'rates', exchange, asset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (exchange) params.set('exchange', exchange);
      if (asset) params.set('asset', asset);
      const qs = params.toString();
      const res = await fetch(`/api/apr${qs ? '?' + qs : ''}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiEnvelope<AprSnapshot[]>;
      return json.data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useAprByAsset(symbol: string) {
  return useQuery({
    queryKey: ['apr', 'asset', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/apr/asset/${encodeURIComponent(symbol)}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as ApiEnvelope<{ symbol: string; rates: AprSnapshot[] }>;
      return json.data ?? { symbol, rates: [] };
    },
    enabled: !!symbol,
    refetchInterval: 30_000,
  });
}

export function useAprAssets() {
  return useQuery({
    queryKey: ['apr', 'assets'],
    queryFn: async () => {
      const res = await fetch('/api/apr/assets', { cache: 'no-store' });
      const json = (await res.json()) as ApiEnvelope<string[]>;
      return json.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAprTrends(limit = 10) {
  return useQuery({
    queryKey: ['apr', 'trends', limit],
    queryFn: async () => {
      const res = await fetch(`/api/apr/trends?limit=${limit}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiEnvelope<AprTrendResult[]>;
      return json.data ?? [];
    },
    refetchInterval: 30_000,
  });
}
