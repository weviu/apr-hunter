'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Signal } from '@/types/signal';

interface Env<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Market-wide trading signals from the scanner feed, newest first.
 * The scanner runs every 5 minutes, so a 60s poll keeps the page fresh cheaply.
 */
export function useSignals(limit = 60) {
  return useQuery({
    queryKey: ['signals', limit],
    queryFn: async () => {
      const res = await api.get<Env<Signal[]>>(`/api/signals?limit=${limit}`);
      return (res.data as Env<Signal[]>).data ?? [];
    },
    refetchInterval: 60_000,
  });
}
