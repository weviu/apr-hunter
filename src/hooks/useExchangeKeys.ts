'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ExchangeKeyEntry {
  exchange: string;
  hasKey: boolean;
  lastVerifiedAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get list of exchanges the user has configured keys for.
 */
export function useExchangeKeysMetadata() {
  return useQuery({
    queryKey: ['exchange-keys'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ExchangeKeyEntry[]>>('/api/exchanges');
      return (res.data as ApiResponse<ExchangeKeyEntry[]>).data ?? [];
    },
  });
}

/**
 * Save (or update) exchange API keys.
 */
export function useSaveExchangeKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      exchange: string;
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
    }) => {
      const res = await api.post<ApiResponse<{ exchange: string }>>('/api/exchanges', payload);
      return (res.data as ApiResponse<{ exchange: string }>).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-keys'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-connected'] });
    },
  });
}

/**
 * Remove exchange API keys.
 */
export function useRemoveExchangeKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exchange: string) => {
      await api.delete(`/api/exchanges?exchange=${encodeURIComponent(exchange)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-keys'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-connected'] });
    },
  });
}
