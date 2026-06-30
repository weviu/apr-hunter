'use client';

import { useMemo, useState } from 'react';
import { Building2, Loader2, Download } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useScanExchanges, type ExchangeHolding } from '@/hooks/useExchangeHoldings';
import { useCreatePosition, usePrices } from '@/hooks/useMyPositions';
import { formatApr } from '@/lib/utils/apr-utils';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const keyOf = (h: ExchangeHolding) => `${h.exchange}-${h.asset}-${h.type}`;

/**
 * Scan connected exchanges (via saved API keys) for the user's real balances —
 * spot + earn — and import them as positions. The spot toggle hides idle
 * (non-earning) balances. Lives on the My Positions page header.
 */
export function ExchangeScan() {
  const scan = useScanExchanges();
  const createPosition = useCreatePosition();

  const [open, setOpen] = useState(false);
  const [holdings, setHoldings] = useState<ExchangeHolding[]>([]);
  const [showSpot, setShowSpot] = useState(true);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data: prices = {} } = usePrices(holdings.map((h) => h.asset));

  const visible = useMemo(
    () => (showSpot ? holdings : holdings.filter((h) => h.type !== 'spot')),
    [holdings, showSpot],
  );

  const runScan = async () => {
    setError(null);
    setHoldings([]);
    setImported(new Set());
    setOpen(true);
    try {
      const data = await scan.mutateAsync();
      setHoldings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Exchange scan failed');
    }
  };

  const importOne = async (h: ExchangeHolding) => {
    await createPosition.mutateAsync({
      asset: h.asset,
      exchange: h.exchange,
      product: h.product ?? (h.type === 'spot' ? 'Spot' : 'Earn'),
      amount: h.amount,
      apr: h.aprCurrent ?? 0,
    });
    setImported((prev) => new Set([...prev, keyOf(h)]));
  };

  return (
    <>
      <Button variant="secondary" leftIcon={<Building2 size={16} />} onClick={runScan}>
        Scan Exchanges
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Detected exchange holdings">
        {scan.isPending ? (
          <div className="py-10 text-center text-fg-muted">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
            <p className="mt-3 text-sm">Reading your balances…</p>
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-danger">{error}</p>
        ) : holdings.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">
            No balances found. Connect an exchange in Settings, or check that your keys have read access.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-faint">
                Showing {visible.length} of {holdings.length}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showSpot}
                onClick={() => setShowSpot((s) => !s)}
                className="flex items-center gap-2 text-sm text-fg-muted"
              >
                Show spot
                <span
                  className={`relative h-5 w-9 rounded-full transition ${
                    showSpot ? 'bg-accent' : 'bg-surface-active'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                      showSpot ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </span>
              </button>
            </div>

            {visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">
                Only spot balances found — toggle “Show spot” to see them.
              </p>
            ) : (
              visible.map((h) => {
                const k = keyOf(h);
                const price = prices[h.asset.toUpperCase()];
                const value = price != null ? h.amount * price : null;
                const done = imported.has(k);
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4 rounded-lg border border-hairline bg-canvas p-4"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-fg">
                        {h.asset}
                        <span className="text-xs text-fg-faint">· {h.exchange}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            h.type === 'earn'
                              ? 'bg-success-soft text-success'
                              : 'border border-hairline text-fg-muted'
                          }`}
                        >
                          {h.type === 'earn' ? h.product ?? 'Earn' : 'Spot'}
                        </span>
                      </p>
                      <p className="truncate text-sm text-fg-muted">
                        {h.amount.toLocaleString('en-US', { maximumFractionDigits: 8 })} {h.asset}
                        {value != null ? ` · ${usd(value)}` : ''}
                      </p>
                      <p className="mt-0.5 text-sm text-accent">
                        {h.aprCurrent != null ? `${formatApr(h.aprCurrent)} APR` : 'No live APR'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={done}
                      onClick={() => importOne(h)}
                      leftIcon={done ? undefined : <Download size={14} />}
                    >
                      {done ? 'Imported' : 'Import'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
