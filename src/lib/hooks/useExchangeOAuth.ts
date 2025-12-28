'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CexHolding } from '@/lib/exchanges/cex-adapter-oauth';

interface ConnectedExchangesResponse {
  success: boolean;
  data?: {
    connected: string[];
    all: string[];
  };
  message?: string;
}

interface HoldingsResponse {
  success: boolean;
  data?: {
    exchange: string;
    holdings: CexHolding[];
  };
  message?: string;
  code?: string;
}

interface OAuthInitiateResponse {
  success: boolean;
  data?: {
    redirectUrl: string;
  };
  message?: string;
}

/**
 * Get list of exchanges user has connected via OAuth
 */
export function useConnectedExchanges() {
  return useQuery({
    queryKey: ['connected-exchanges'],
    queryFn: async () => {
      const res = await api.get<ConnectedExchangesResponse>('/api/exchanges/connected');
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch connected exchanges');
      }
      return res.data.data || { connected: [], all: [] };
    },
  });
}

/**
 * Fetch holdings from a connected exchange
 */
export function useExchangeHoldings(exchange: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['exchange-holdings-oauth', exchange],
    queryFn: async () => {
      const res = await api.get<HoldingsResponse>(
        `/api/exchanges/holdings?exchange=${encodeURIComponent(exchange)}`
      );

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch holdings');
      }

      return res.data.data?.holdings || [];
    },
    enabled: options?.enabled !== false && !!exchange,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry auth errors
  });
}

/**
 * Initiate OAuth flow for an exchange
 */
export function useInitiateOAuth() {
  return useMutation({
    mutationFn: async (exchange: string) => {
      const res = await api.post<OAuthInitiateResponse>('/api/oauth/initiate', { exchange });
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to initiate OAuth');
      }
      return res.data.data?.redirectUrl || '';
    },
    onSuccess: (redirectUrl) => {
      // Redirect to exchange OAuth page
      window.location.href = redirectUrl;
    },
  });
}

/**
 * Disconnect an exchange
 */
export function useDisconnectExchange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exchange: string) => {
      const res = await api.delete('/api/exchanges/connected?exchange=' + exchange);
      return res;
    },
    onSuccess: () => {
      // Invalidate connected exchanges query
      queryClient.invalidateQueries({ queryKey: ['connected-exchanges'] });
    },
  });
}
