'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';
import { useAprAssets, useAprRates } from '@/hooks/useApr';
import { useCreateAlert } from '@/hooks/useAlerts';
import { Button, Card, FadeRise } from '@/components/ui';

const fieldClass =
  'w-full rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-fg ' +
  'placeholder:text-fg-faint transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40';

export default function NewAlertPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { data: assets = [] } = useAprAssets();
  const createAlert = useCreateAlert();

  const [asset, setAsset] = useState('');
  const [exchange, setExchange] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [formError, setFormError] = useState('');

  // Get rates for the selected asset to show available exchanges + current APR
  const { data: assetRates = [] } = useAprRates(undefined, asset || undefined);
  const exchanges = [...new Set(assetRates.map((r) => r.exchange))].sort();
  const currentApr = assetRates.find((r) => r.exchange === exchange)?.apr;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Reset exchange when asset changes
  useEffect(() => {
    setExchange('');
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!asset || !threshold) {
      setFormError('Please fill in all required fields');
      return;
    }

    const thresholdNum = parseFloat(threshold);
    if (Number.isNaN(thresholdNum) || thresholdNum < 0) {
      setFormError('Please enter a valid threshold percentage');
      return;
    }

    try {
      await createAlert.mutateAsync({
        asset,
        exchange: exchange || undefined,
        condition,
        threshold: thresholdNum,
      });
      router.push('/dashboard/alerts');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create alert');
    }
  };

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

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/alerts"
          className="mb-6 inline-flex items-center text-sm text-fg-muted transition hover:text-fg"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Alerts
        </Link>

        <FadeRise>
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Create New Alert</h1>
            <p className="mt-1 text-sm text-fg-muted">Get notified when APR rates change.</p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-soft p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <p className="text-sm text-danger">{formError}</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg-muted">
                  Asset <span className="text-danger">*</span>
                </label>
                <select value={asset} onChange={(e) => setAsset(e.target.value)} className={fieldClass}>
                  <option value="">Select an asset</option>
                  {assets.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {asset && exchanges.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Exchange / Platform <span className="text-fg-faint">(optional)</span>
                  </label>
                  <select
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Any exchange</option>
                    {exchanges.map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {asset && exchange && currentApr !== undefined && (
                <div className="rounded-lg border border-hairline bg-canvas p-4">
                  <p className="text-sm text-fg-muted">
                    Current APR for {asset} on {exchange}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-accent">
                    {(currentApr * 100).toFixed(2)}%
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-fg-muted">Alert when APR goes</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCondition('above')}
                    className={`rounded-lg border p-4 transition ${
                      condition === 'above'
                        ? 'border-success bg-success-soft'
                        : 'border-hairline bg-surface hover:border-hairline-strong'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ArrowUp className={`h-5 w-5 ${condition === 'above' ? 'text-success' : 'text-fg-faint'}`} />
                      <span className={`font-medium ${condition === 'above' ? 'text-success' : 'text-fg-muted'}`}>
                        Above
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-fg-faint">Alert when APR rises</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('below')}
                    className={`rounded-lg border p-4 transition ${
                      condition === 'below'
                        ? 'border-danger bg-danger-soft'
                        : 'border-hairline bg-surface hover:border-hairline-strong'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ArrowDown className={`h-5 w-5 ${condition === 'below' ? 'text-danger' : 'text-fg-faint'}`} />
                      <span className={`font-medium ${condition === 'below' ? 'text-danger' : 'text-fg-muted'}`}>
                        Below
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-fg-faint">Alert when APR drops</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg-muted">
                  Threshold (%) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="e.g. 5.00"
                    className={`${fieldClass} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint">%</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link href="/dashboard/alerts">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" loading={createAlert.isPending} loadingText="Creating…">
                  Create Alert
                </Button>
              </div>
            </form>
          </Card>
        </FadeRise>
      </main>
    </div>
  );
}
