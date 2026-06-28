'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { useAprAssets, useAprByAsset } from '@/hooks/useApr';
import { useAprProducts, useCreatePosition } from '@/hooks/useMyPositions';
import { formatApr, getFreshness } from '@/lib/utils/apr-utils';

const fieldClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-fg ' +
  'transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50';

const MIN_SUBMIT_MS = 400;
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface AddPositionModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddPositionModal({ open, onClose }: AddPositionModalProps) {
  const [asset, setAsset] = useState('');
  const [exchange, setExchange] = useState('');
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: assets = [] } = useAprAssets();
  const { data: assetData } = useAprByAsset(asset);
  const platforms = useMemo(
    () => Array.from(new Set((assetData?.rates ?? []).map((r) => r.exchange))).sort(),
    [assetData],
  );
  const { data: products = [] } = useAprProducts(asset, exchange);
  const createPosition = useCreatePosition();

  // Reset dependent fields when a parent selection changes.
  useEffect(() => {
    setExchange('');
    setProduct('');
  }, [asset]);
  useEffect(() => {
    setProduct('');
  }, [exchange]);
  // Auto-select when there's exactly one product.
  useEffect(() => {
    if (products.length === 1 && products[0].product) setProduct(products[0].product);
  }, [products]);

  const selected = products.find((p) => p.product === product);

  const reset = () => {
    setAsset('');
    setExchange('');
    setProduct('');
    setAmount('');
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!asset || !exchange) {
      setError('Pick an asset and platform');
      return;
    }
    if (products.length > 0 && !product) {
      setError('Pick a product');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await Promise.all([
        createPosition.mutateAsync({ asset, exchange, product: product || null, amount: amt }),
        delay(MIN_SUBMIT_MS),
      ]);
      reset();
      setSubmitting(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add position');
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add position" dismissible={!submitting}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        {error && (
          <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg-muted">Asset</label>
          <select value={asset} onChange={(e) => setAsset(e.target.value)} disabled={submitting} className={fieldClass}>
            <option value="">Select an asset</option>
            {assets.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg-muted">
            Platform {asset && platforms.length === 0 && <span className="text-fg-faint">(none available)</span>}
          </label>
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            disabled={!asset || submitting}
            className={fieldClass}
          >
            <option value="">{asset ? 'Select a platform' : 'Pick an asset first'}</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg-muted">Product</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            disabled={!exchange || submitting}
            className={fieldClass}
          >
            <option value="">{exchange ? 'Select a product' : 'Pick a platform first'}</option>
            {products.map((p) => (
              <option key={p.product ?? ''} value={p.product ?? ''}>
                {p.product ?? 'Earn'} — {formatApr(p.apr)}
              </option>
            ))}
          </select>
        </div>

        {/* Live rate readout — the trust-building part */}
        {selected && (
          <div className="rounded-md border border-hairline bg-canvas px-3 py-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">Current live rate</span>
              <span className="text-lg font-semibold text-accent">{formatApr(selected.apr)}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className={`h-1.5 w-1.5 rounded-full ${getFreshness(selected.syncedAt).dotColor}`} />
              <span className={getFreshness(selected.syncedAt).color}>
                {getFreshness(selected.syncedAt).label}
              </span>
              <span className="text-fg-faint">· locked at entry</span>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg-muted">Amount</label>
          <input
            type="number"
            step="0.00000001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            placeholder={asset ? `Amount of ${asset}` : 'Amount'}
            className={fieldClass}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} loadingText="Adding…">
            Add position
          </Button>
        </div>
      </form>
    </Modal>
  );
}
