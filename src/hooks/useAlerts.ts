'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Alert {
  id: string;
  userId: string;
  asset: string;
  exchange: string | null;
  condition: 'above' | 'below';
  threshold: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Alert[]>>('/api/alerts');
      return (res.data as ApiResponse<Alert[]>).data ?? [];
    },
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      asset: string;
      exchange?: string;
      condition: 'above' | 'below';
      threshold: number;
    }) => {
      const res = await api.post<ApiResponse<Alert>>('/api/alerts', data);
      return (res.data as ApiResponse<Alert>).data as Alert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useUpdateAlert(alertId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Pick<Alert, 'condition' | 'threshold' | 'active'>>) => {
      const res = await api.patch<ApiResponse<Alert>>(`/api/alerts/${alertId}`, data);
      return (res.data as ApiResponse<Alert>).data as Alert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      await api.delete(`/api/alerts/${alertId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
