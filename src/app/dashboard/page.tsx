'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet, Loader2, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';
import { useUserPositions, usePrices, useRemovePosition } from '@/hooks/useMyPositions';
import { AddPositionModal } from '@/components/AddPositionModal';
import { Web3Scan } from '@/components/Web3Scan';
import { ExchangeScan } from '@/components/ExchangeScan';
import { Button, Card, FadeRise, Modal, Skeleton, Stagger, StaggerItem } from '@/components/ui';
import { formatApr, getFreshness } from '@/lib/utils/apr-utils';
import type { EnrichedPosition } from '@/types/portfolio';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: positions = [], isLoading: loadingPositions } = useUserPositions();
  const symbols = useMemo(() => positions.map((p) => p.asset), [positions]);
  const { data: prices = {} } = usePrices(symbols);
  const removePosition = useRemovePosition();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const valueOf = (p: EnrichedPosition): number | null => {
    const price = prices[p.asset.toUpperCase()];
    return price != null ? p.amount * price : null;
  };

  const summary = useMemo(() => {
    let totalValue = 0;
    let monthly = 0;
    for (const p of positions) {
      const price = prices[p.asset.toUpperCase()];
      if (price == null) continue;
      const value = p.amount * price;
      totalValue += value;
      const apr = p.currentApr ?? p.aprAtEntry;
      if (apr != null) monthly += (value * apr) / 12;
    }
    return { totalValue, monthly };
  }, [positions, prices]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <Header />
        <div className="flex h-[calc(100vh-80px)] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-hairline border-t-accent" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <FadeRise className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">My Positions</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Your staking &amp; earn positions with live rates and value.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExchangeScan />
            <Web3Scan />
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Adding positions is currently disabled"
              className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-hairline bg-surface-active px-4 text-sm font-medium text-fg-faint"
            >
              <Plus size={16} />
              Add Position
            </button>
          </div>
        </FadeRise>

        {/* Summary */}
        <Stagger className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StaggerItem>
            <Card className="p-5">
              <p className="text-sm text-fg-muted">Total Value</p>
              {loadingPositions ? (
                <Skeleton className="mt-2 h-7 w-28" />
              ) : (
                <p className="mt-1 text-2xl font-semibold text-fg">{usd(summary.totalValue)}</p>
              )}
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="p-5">
              <p className="text-sm text-fg-muted">Est. Monthly Earnings</p>
              {loadingPositions ? (
                <Skeleton className="mt-2 h-7 w-24" />
              ) : (
                <p className="mt-1 text-2xl font-semibold text-accent">{usd(summary.monthly)}</p>
              )}
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="p-5">
              <p className="text-sm text-fg-muted">Positions</p>
              {loadingPositions ? (
                <Skeleton className="mt-2 h-7 w-10" />
              ) : (
                <p className="mt-1 text-2xl font-semibold text-fg">{positions.length}</p>
              )}
            </Card>
          </StaggerItem>
        </Stagger>

        {/* Positions */}
        {loadingPositions ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-2 h-4 w-40" />
                <Skeleton className="mt-4 h-6 w-20" />
              </Card>
            ))}
          </div>
        ) : positions.length === 0 ? (
          <FadeRise>
            <Card className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover">
                <Wallet className="h-6 w-6 text-fg-faint" />
              </div>
              <h3 className="text-sm font-medium text-fg">No positions yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
                Add a position to track its live APR and USD value.
              </p>
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Adding positions is currently disabled"
                  className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-hairline bg-surface-active px-4 text-sm font-medium text-fg-faint"
                >
                  <Plus size={16} />
                  Add Position
                </button>
              </div>
            </Card>
          </FadeRise>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {positions.map((p) => {
              const value = valueOf(p);
              const apr = p.currentApr ?? p.aprAtEntry;
              const fresh = getFreshness(p.aprSyncedAt ?? undefined);
              const removing = removePosition.isPending && removePosition.variables === p.id;
              return (
                <FadeRise key={p.id}>
                  <Card className="group relative p-5">
                    <button
                      onClick={() => setConfirmId(p.id)}
                      disabled={removing}
                      className="absolute right-3 top-3 rounded-md p-1.5 text-fg-faint opacity-0 transition hover:bg-danger-soft hover:text-danger group-hover:opacity-100 disabled:opacity-50"
                      title="Remove position"
                      aria-label="Remove position"
                    >
                      {removing ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                    </button>

                    <div className="flex items-start justify-between gap-4 pr-6">
                      <div className="min-w-0">
                        <h3 className="font-medium text-fg">{p.asset}</h3>
                        <p className="mt-0.5 truncate text-sm capitalize text-fg-muted">
                          {p.exchange}
                          {p.product ? ` · ${p.product}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-fg">{value != null ? usd(value) : '—'}</p>
                        <p className="text-xs text-fg-faint">
                          {p.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {p.asset}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-sm font-medium text-accent">
                        {apr != null ? `${formatApr(apr)} APR` : 'No live rate'}
                      </span>
                      {p.aprSyncedAt ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`h-1.5 w-1.5 rounded-full ${fresh.dotColor}`} />
                          <span className={fresh.color}>{fresh.label}</span>
                        </span>
                      ) : p.protocol ? (
                        <span className="text-xs text-fg-faint">on-chain · from wallet</span>
                      ) : null}
                    </div>
                  </Card>
                </FadeRise>
              );
            })}
          </div>
        )}
      </main>

      <AddPositionModal open={addOpen} onClose={() => setAddOpen(false)} />

      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Remove position?"
        size="sm"
        dismissible={!removePosition.isPending}
      >
        {(() => {
          const target = positions.find((p) => p.id === confirmId);
          return (
            <>
              <p className="text-sm text-fg-muted">
                This stops tracking{' '}
                <span className="font-medium text-fg">{target?.asset ?? 'this position'}</span>
                {target?.exchange ? ` on ${target.exchange}` : ''}. It won&apos;t touch any funds on
                the exchange.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmId(null)}
                  disabled={removePosition.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="border-danger/30 bg-danger-soft"
                  loading={removePosition.isPending}
                  onClick={() => {
                    if (confirmId) {
                      removePosition.mutate(confirmId, { onSuccess: () => setConfirmId(null) });
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}
