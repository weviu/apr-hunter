'use client';

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

export function usePortfolios(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [PORTFOLIOS_KEY],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Portfolio[]>>('/api/portfolios');
      return (res.data as ApiResponse<Portfolio[]>).data ?? [];
    },
    enabled: options?.enabled !== false,
  });
}

export function usePortfolio(portfolioId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [PORTFOLIOS_KEY, portfolioId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ portfolio: Portfolio; positions: Position[]; stats: Record<string, unknown> }>>(
        `/api/portfolios/${portfolioId}`
      );
      return (res.data as ApiResponse<{ portfolio: Portfolio; positions: Position[]; stats: Record<string, unknown> }>).data ?? {};
    },
    enabled: options?.enabled !== false && !!portfolioId,
  });
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await api.post<ApiResponse<Portfolio>>('/api/portfolios', data);
      return (res.data as ApiResponse<Portfolio>).data as Portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY] });
    },
  });
}

export function useUpdatePortfolio(portfolioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Portfolio>) => {
      const res = await api.patch<ApiResponse<Portfolio>>(
        `/api/portfolios/${portfolioId}`,
        data
      );
      return (res.data as ApiResponse<Portfolio>).data as Portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY, portfolioId] });
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY] });
    },
  });
}

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

export function usePositions(portfolioId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [POSITIONS_KEY, portfolioId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Position[]>>(
        `/api/portfolios/${portfolioId}/positions`
      );
      return (res.data as ApiResponse<Position[]>).data ?? [];
    },
    enabled: options?.enabled !== false && !!portfolioId,
  });
}

export function usePosition(portfolioId: string, positionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [POSITIONS_KEY, portfolioId, positionId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ position: Position; history: PositionSnapshot[] }>>(
        `/api/portfolios/${portfolioId}/positions/${positionId}`
      );
      return (res.data as ApiResponse<{ position: Position; history: PositionSnapshot[] }>).data ?? {};
    },
    enabled: options?.enabled !== false && !!portfolioId && !!positionId,
  });
}

export function useCreatePosition(portfolioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      asset: string;
      exchange: string;
      amount: number;
      aprAtEntry: number;
      stakedAt?: string;
      protocol?: string | null;
      chainId?: number | null;
      walletAddress?: string | null;
      notes?: string | null;
    }) => {
      const res = await api.post<ApiResponse<Position>>(
        `/api/portfolios/${portfolioId}/positions`,
        data
      );
      return (res.data as ApiResponse<Position>).data as Position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY, portfolioId] });
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY, portfolioId] });
    },
  });
}

export function useUpdatePosition(portfolioId: string, positionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Position>) => {
      const res = await api.patch<ApiResponse<Position>>(
        `/api/portfolios/${portfolioId}/positions/${positionId}`,
        data
      );
      return (res.data as ApiResponse<Position>).data as Position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY, portfolioId, positionId] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY, portfolioId] });
      queryClient.invalidateQueries({ queryKey: [PORTFOLIOS_KEY, portfolioId] });
    },
  });
}

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

export function usePositionSnapshots(
  portfolioId: string,
  positionId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['position-snapshots', portfolioId, positionId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PositionSnapshot[]>>(
        `/api/portfolios/${portfolioId}/positions/${positionId}/snapshots`
      );
      return (res.data as ApiResponse<PositionSnapshot[]>).data ?? [];
    },
    enabled: options?.enabled !== false && !!portfolioId && !!positionId,
  });
}
