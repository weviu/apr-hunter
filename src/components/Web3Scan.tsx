'use client';

import { useState } from 'react';
import { useMetaMask } from '@/lib/web3/useMetaMask';
import { Wallet, Loader2, Download } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import {
  useScanAave,
  useCreatePosition,
  usePrices,
  type DetectedAavePosition,
} from '@/hooks/useMyPositions';
import { formatApr } from '@/lib/utils/apr-utils';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const keyOf = (p: DetectedAavePosition) => `${p.walletAddress}-${p.asset}`;

/**
 * Connect Wallet → scan for Aave V3 supply positions (server-side, Sepolia) →
 * import detected positions. Lives on the My Positions page header.
 */
export function Web3Scan() {
  const { address, chainId, isConnected, connectMetaMask } = useMetaMask();
  const scan = useScanAave();
  const createPosition = useCreatePosition();

  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<DetectedAavePosition[]>([]);
  const [usedDemo, setUsedDemo] = useState(false);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data: prices = {} } = usePrices(results.map((r) => r.asset));

  const runScan = async () => {
    setError(null);
    setResults([]);
    setImported(new Set());
    setUsedDemo(false);
    setOpen(true);
    try {
      const data = await scan.mutateAsync({ address, chainId });
      setResults(data.positions);
      setUsedDemo(data.usedDemo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet scan failed');
    }
  };

  const importOne = async (p: DetectedAavePosition) => {
    await createPosition.mutateAsync({
      asset: p.asset,
      exchange: p.exchange,
      product: p.product,
      amount: p.amount,
      apr: p.apr,
      protocol: 'aave',
      chainId: p.chainId,
      walletAddress: p.walletAddress,
    });
    setImported((prev) => new Set([...prev, keyOf(p)]));
  };

  return (
    <>
      <Button
        variant="secondary"
        leftIcon={<Wallet size={16} />}
        onClick={isConnected ? runScan : connectMetaMask}
      >
        {isConnected ? 'Scan Wallet' : 'Connect Wallet'}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Detected Aave positions">
        {scan.isPending ? (
          <div className="py-10 text-center text-fg-muted">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
            <p className="mt-3 text-sm">Scanning wallet…</p>
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-danger">{error}</p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">
            No Aave positions found in this wallet.
          </p>
        ) : (
          <div className="space-y-3">
            {usedDemo && (
              <p className="rounded-md border border-hairline bg-canvas px-3 py-2 text-xs text-fg-muted">
                Showing a demo wallet  your connected wallet has no Aave positions.
              </p>
            )}
            {results.map((p) => {
              const k = keyOf(p);
              const price = prices[p.asset.toUpperCase()];
              const value = price != null ? p.amount * price : null;
              const done = imported.has(k);
              return (
                <div
                  key={k}
                  className="flex items-center justify-between gap-4 rounded-lg border border-hairline bg-canvas p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-fg">
                      {p.asset} <span className="text-xs text-fg-faint">· Aave V3</span>
                    </p>
                    <p className="truncate text-sm text-fg-muted">
                      {p.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {p.asset}
                      {value != null ? ` · ${usd(value)}` : ''}
                    </p>
                    <p className="mt-0.5 text-sm text-accent">{formatApr(p.apr)} APR</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={done}
                    onClick={() => importOne(p)}
                    leftIcon={done ? undefined : <Download size={14} />}
                  >
                    {done ? 'Imported' : 'Import'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
}
