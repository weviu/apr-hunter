import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CexHolding } from '@/lib/exchanges/cex-adapter';

interface ExchangeHoldingsResponse {
  success: boolean;
  data?: {
    exchange: string;
    holdings: CexHolding[];
  };
  message?: string;
}

interface SupportedExchangesResponse {
  success: boolean;
  data?: {
    exchanges: string[];
  };
}

/**
 * Fetch list of supported exchanges
 */
export function useSupportedExchanges() {
  return useQuery({
    queryKey: ['supported-exchanges'],
    queryFn: async () => {
      const res = await api.get<SupportedExchangesResponse>('/api/exchanges');
      return res.data.data?.exchanges || [];
    },
  });
}

/**
 * Fetch holdings from a specific exchange
 */
export function useExchangeHoldings(exchange: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['exchange-holdings', exchange],
    queryFn: async () => {
      const res = await api.get<ExchangeHoldingsResponse>(
        `/api/exchanges?exchange=${encodeURIComponent(exchange)}`
      );

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch holdings');
      }

      return res.data.data?.holdings || [];
    },
    enabled: options?.enabled !== false && !!exchange,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
