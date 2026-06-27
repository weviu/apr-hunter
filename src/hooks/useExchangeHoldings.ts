'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ExchangeHolding {
  asset: string;
  exchange: string;
  amount: number | null;
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
 * Fetch holdings from connected exchanges, optionally filtered by exchange name.
 */
export function useExchangeHoldings(exchange?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['exchange-holdings', exchange],
    queryFn: async () => {
      const url = exchange
        ? `/api/exchanges/holdings?exchange=${encodeURIComponent(exchange)}`
        : '/api/exchanges/holdings';
      const res = await api.get<ApiResponse<ExchangeHolding[]>>(url);
      return (res.data as ApiResponse<ExchangeHolding[]>).data ?? [];
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
