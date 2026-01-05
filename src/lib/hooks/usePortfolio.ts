import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Portfolio, Position, PositionSnapshot } from '@/types/portfolio';

const PORTFOLIOS_KEY = 'portfolios';
const POSITIONS_KEY = 'positions';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ Portfolio Queries ============

/**
 * Fetch all user portfolios
 */
export function usePortfolios(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [PORTFOLIOS_KEY],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ portfolios: Portfolio[] }>>('/api/portfolios');
      return res.data.data?.portfolios || [];
    },
    enabled: options?.enabled !== false,
  });
}

/**
 * Fetch single portfolio with positions and stats
 */
export function usePortfolio(portfolioId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [PORTFOLIOS_KEY, portfolioId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{
        portfolio: Portfolio;
        positions: Position[];
        stats: Record<string, unknown>;
      }>>(`/api/portfolios/${portfolioId}`);
      return res.data.data || {};
    },
    enabled: options?.enabled !== false && !!portfolioId,
  });
}

/**
 * Create new portfolio
 */
export function useCreatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      type: 'web2' | 'web3';
      walletAddress?: string;
      detectedPositions?: Position[];
    }) => {
      // Extract detected positions for separate API call
      const { detectedPositions, ...portfolioData } = data;

      // Create portfolio
      const res = await api.post<ApiResponse<{ portfolio: Portfolio }>>('/api/portfolios', portfolioData);
      const portfolio = res.data.data?.portfolio as Portfolio;

      // If Web3 and has detected positions, save them
      if (portfolio && detectedPositions && detectedPositions.length > 0) {
        try {
          // Save each detected position
          for (const position of detectedPositions) {
            await api.post(`/api/portfolios/${portfolio._id}/positions`, {
              symbol: position.symbol,
              asset: position.asset,
              platform: position.platform,
              platformType: position.platformType,
              chain: position.chain,
              amount: position.amount,
              apr: position.apr,
              source: position.source || 'web3-detection',
            });
          }
        } catch (err) {
          console.warn('Failed to save some detected positions:', err);
          // Don't fail the entire operation if positions fail to save
        }
      }

      return portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
    },
  });
}

/**
 * Update portfolio
 */
export function useUpdatePortfolio(portfolioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Portfolio>) => {
      const res = await api.patch<ApiResponse<{ portfolio: Portfolio }>>(
        `/api/portfolios/${portfolioId}`,
        data
      );
      return res.data.data?.portfolio as Portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY, portfolioId] });
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY] });
    },
  });
}

/**
 * Delete portfolio
 */
export function useDeletePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (portfolioId: string) => {
      await api.delete(`/api/portfolios/${portfolioId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY] });
    },
  });
}

// ============ Position Queries ============

/**
 * Fetch all positions in a portfolio
 */
export function usePositions(portfolioId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [POSITIONS_KEY, portfolioId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ positions: Position[] }>>(
        `/api/portfolios/${portfolioId}/positions`
      );
      return res.data.data?.positions || [];
    },
    enabled: options?.enabled !== false && !!portfolioId,
  });
}

/**
 * Fetch single position with history
 */
export function usePosition(portfolioId: string, positionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [POSITIONS_KEY, portfolioId, positionId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{
        position: Position;
        history: PositionSnapshot[];
      }>>(`/api/portfolios/${portfolioId}/positions/${positionId}`);
      return res.data.data || {};
    },
    enabled: options?.enabled !== false && !!portfolioId && !!positionId,
  });
}

/**
 * Create position in portfolio
 */
export function useCreatePosition(portfolioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      symbol: string;
      asset: string;
      platform: string;
      platformType?: string;
      chain?: string;
      amount: number;
      apr?: number;
      riskLevel?: string;
      source?: string;
    }) => {
      const res = await api.post<ApiResponse<{ position: Position }>>(
        `/api/portfolios/${portfolioId}/positions`,
        data
      );
      return res.data.data?.position as Position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY, portfolioId] });
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY, portfolioId] });
    },
  });
}

/**
 * Update position
 */
export function useUpdatePosition(portfolioId: string, positionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Position>) => {
      const res = await api.patch<ApiResponse<{ position: Position }>>(
        `/api/portfolios/${portfolioId}/positions/${positionId}`,
        data
      );
      return res.data.data?.position as Position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY, portfolioId, positionId] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY, portfolioId] });
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY, portfolioId] });
    },
  });
}

/**
 * Delete position
 */
export function useDeletePosition(portfolioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionId: string) => {
      await api.delete(`/api/portfolios/${portfolioId}/positions/${positionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY, portfolioId] });
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY, portfolioId] });
    },
  });
}

// ============ Position Snapshots (History) ============

/**
 * Fetch position snapshots to view position history
 */
export function usePositionSnapshots(
  portfolioId: string,
  positionId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['position-snapshots', portfolioId, positionId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ snapshots: PositionSnapshot[] }>>(
        `/api/portfolios/${portfolioId}/positions/${positionId}/snapshots`
      );
      return res.data.data?.snapshots || [];
    },
    enabled: options?.enabled !== false && !!portfolioId && !!positionId,
  });
}

// ============ Batch Operations ============

/**
 * Prefetch portfolio to avoid waterfall requests
 */
export function usePrefetchPortfolio(queryClient: ReturnType<typeof useQueryClient>) {
  return (portfolioId: string) => {
    queryClient.prefetchQuery({
      queryKey: [PORTFOLIOS_KEY, portfolioId],
      queryFn: async () => {
        const res = await api.get<Record<string, unknown>>(`/api/portfolios/${portfolioId}`);
        return res.data;
      },
    });
  };
}
