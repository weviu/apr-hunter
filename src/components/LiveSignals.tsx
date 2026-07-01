'use client';

import { Radio, RefreshCw } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { SignalCard } from '@/components/SignalCard';
import { Card, Skeleton, Stagger, StaggerItem } from '@/components/ui';
import type { Signal } from '@/types/signal';

export function LiveSignals() {
  const { data: signals = [], isLoading, error, isFetching, refetch } = useSignals(60);

  return (
    <div>
      {/* Control bar. Filter/sort controls (direction, symbol, min-confidence)
          will slot in on the left here in a follow-up. */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Radio className="h-4 w-4 text-accent" />
          <span>15m scan · updates every 5 min</span>
          {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-accent" />}
        </div>
        <button
          onClick={() => void refetch()}
          aria-label="Refresh signals"
          title="Refresh"
          className="flex items-center rounded-md px-2 py-1 text-accent transition hover:bg-accent-soft"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-2 h-4 w-32" />
              <Skeleton className="mt-5 h-6 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-danger">Couldn&apos;t load signals. Please try again shortly.</p>
        </Card>
      ) : signals.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover">
            <Radio className="h-6 w-6 text-fg-faint" />
          </div>
          <h3 className="text-sm font-medium text-fg">No signals right now</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
            The scanner runs every 5 minutes. New setups will appear here as they&apos;re detected.
          </p>
        </Card>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(signals as Signal[]).map((s, i) => (
            <StaggerItem key={`${s.symbol}-${s.timestamp}-${i}`}>
              <SignalCard signal={s} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
