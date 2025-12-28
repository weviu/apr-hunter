'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ExchangeKeysMetadata {
  [exchange: string]: {
    configured: boolean;
    lastUpdated: string | null;
  };
}

interface SaveKeysRequest {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

/**
 * Get metadata about user's configured exchange keys
 */
export function useExchangeKeysMetadata() {
  return useQuery({
    queryKey: ['exchange-keys-metadata'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ExchangeKeysMetadata }>('/api/settings/exchange-keys');
      if (!res.data.success) {
        throw new Error('Failed to fetch exchange keys metadata');
      }
      return res.data.data || {};
    },
  });
}

/**
 * Save exchange API keys
 */
export function useSaveExchangeKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SaveKeysRequest) => {
      const res = await api.post<{ success: boolean; message: string }>('/api/settings/exchange-keys', payload);
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to save keys');
      }
      return res.data;
    },
    onSuccess: () => {
      // Invalidate metadata query to refresh
      queryClient.invalidateQueries({ queryKey: ['exchange-keys-metadata'] });
    },
  });
}

/**
 * Remove exchange API keys
 */
export function useRemoveExchangeKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exchange: string) => {
      const res = await api.delete<{ success: boolean; message: string }>(
        `/api/settings/exchange-keys?exchange=${exchange}`
      );
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to remove keys');
      }
      return res.data;
    },
    onSuccess: () => {
      // Invalidate metadata query to refresh
      queryClient.invalidateQueries({ queryKey: ['exchange-keys-metadata'] });
    },
  });
}
