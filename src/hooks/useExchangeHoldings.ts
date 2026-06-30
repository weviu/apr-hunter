'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ExchangeHolding {
  asset: string;
  exchange: string;
  amount: number;
  type: 'spot' | 'earn';
  product: string | null;
  aprCurrent: number | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch list of exchange names the user has configured.
 */
export function useConnectedExchanges() {
  return useQuery({
    queryKey: ['exchange-connected'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<string[]>>('/api/exchanges/connected');
      return (res.data as ApiResponse<string[]>).data ?? [];
    },
  });
}

/**
 * Scan the user's connected exchanges for real holdings (spot + earn), on demand.
 * Triggered by the "Scan Exchanges" button.
 */
export function useScanExchanges() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get<ApiResponse<ExchangeHolding[]>>('/api/exchanges/holdings');
      return (res.data as ApiResponse<ExchangeHolding[]>).data ?? [];
    },
  });
}
