'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { useExchangeKeysMetadata, useSaveExchangeKeys, useRemoveExchangeKeys } from '@/hooks/useExchangeKeys';
import { Button } from '@/components/ui';

const EXCHANGES = [
  { name: 'OKX', requiresPassphrase: true },
  { name: 'KuCoin', requiresPassphrase: true },
  { name: 'Binance', requiresPassphrase: false },
];

const fieldClass =
  'w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-fg ' +
  'placeholder:text-fg-faint transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50';

export function ExchangeKeysSettings() {
  const { data: keysList = [], isLoading: loadingMetadata, error: metadataError } = useExchangeKeysMetadata();
  const saveKeys = useSaveExchangeKeys();
  const removeKeys = useRemoveExchangeKeys();

  // Build a lookup: exchange name → entry
  const metadata = Object.fromEntries(keysList.map((k) => [k.exchange, k]));

  const [expandedExchange, setExpandedExchange] = useState<string | null>(null);
  const [formData, setFormData] = useState({ apiKey: '', apiSecret: '', passphrase: '' });
  const [error, setError] = useState<string | null>(null);

  const handleSaveKeys = async (exchange: string) => {
    setError(null);

    if (!formData.apiKey.trim() || !formData.apiSecret.trim()) {
      setError('API Key and Secret are required');
      return;
    }

    const requiresPassphrase = EXCHANGES.find((e) => e.name === exchange)?.requiresPassphrase;
    if (requiresPassphrase && !formData.passphrase.trim()) {
      setError('Passphrase is required for ' + exchange);
      return;
    }

    saveKeys.mutate(
      {
        exchange: exchange.toLowerCase(),
        apiKey: formData.apiKey.trim(),
        apiSecret: formData.apiSecret.trim(),
        passphrase: formData.passphrase.trim() || undefined,
      },
      {
        onSuccess: () => {
          setFormData({ apiKey: '', apiSecret: '', passphrase: '' });
          setExpandedExchange(null);
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to save keys');
        },
      }
    );
  };

  const handleRemoveKeys = (exchange: string) => {
    if (confirm(`Are you sure you want to remove ${exchange} API keys?`)) {
      removeKeys.mutate(exchange.toLowerCase(), {
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to remove keys');
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">Exchange API Keys</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Securely store your exchange API keys to import your real holdings. Keys are encrypted and
          never shared.
        </p>
      </div>

      {(error || metadataError) && (
        <div className="flex gap-3 rounded-md border border-danger/30 bg-danger-soft p-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="text-sm text-danger">{error ?? 'Failed to load exchange keys'}</div>
        </div>
      )}

      {loadingMetadata ? (
        <div className="flex items-center justify-center gap-2 py-12 text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {EXCHANGES.map((exchange) => {
            const entry = metadata[exchange.name.toLowerCase()];
            const isConfigured = entry?.hasKey ?? false;
            const lastVerifiedAt = entry?.lastVerifiedAt;
            const isExpanded = expandedExchange === exchange.name;
            const isSaving = saveKeys.isPending && saveKeys.variables?.exchange === exchange.name.toLowerCase();
            const isRemoving = removeKeys.isPending && removeKeys.variables === exchange.name.toLowerCase();
            const isBusy = isSaving || isRemoving;

            return (
              <div key={exchange.name} className="overflow-hidden rounded-lg border border-hairline bg-surface">
                <button
                  onClick={() => setExpandedExchange(isExpanded ? null : exchange.name)}
                  disabled={isBusy}
                  className="flex w-full items-center justify-between px-5 py-4 transition hover:bg-surface-hover disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-fg">{exchange.name}</h3>
                    {isConfigured && <CheckCircle className="h-4 w-4 shrink-0 text-success" />}
                  </div>
                  <div className="text-right text-sm text-fg-muted">
                    {isConfigured ? (
                      <>
                        Connected
                        {lastVerifiedAt && (
                          <span className="block text-xs text-fg-faint">
                            {new Date(lastVerifiedAt).toLocaleDateString()}
                          </span>
                        )}
                      </>
                    ) : (
                      'Not configured'
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-hairline bg-canvas p-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-fg-muted">API Key</label>
                      <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="Enter your API key"
                        disabled={isBusy}
                        className={fieldClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-fg-muted">API Secret</label>
                      <input
                        type="password"
                        value={formData.apiSecret}
                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                        placeholder="Enter your API secret"
                        disabled={isBusy}
                        className={fieldClass}
                      />
                    </div>

                    {exchange.requiresPassphrase && (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-fg-muted">Passphrase</label>
                        <input
                          type="password"
                          value={formData.passphrase}
                          onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                          placeholder="Enter your passphrase"
                          disabled={isBusy}
                          className={fieldClass}
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => void handleSaveKeys(exchange.name)}
                        loading={isSaving}
                        loadingText="Saving…"
                      >
                        Save Keys
                      </Button>

                      {isConfigured && (
                        <button
                          onClick={() => handleRemoveKeys(exchange.name)}
                          disabled={isBusy}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-4 text-sm font-medium text-danger transition hover:bg-danger-soft disabled:opacity-50"
                        >
                          {isRemoving ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Removing…</>
                          ) : (
                            <><Trash2 className="h-4 w-4" /> Remove</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-accent/20 bg-accent-soft p-4">
        <h4 className="mb-3 text-sm font-medium text-accent">How to find your API keys</h4>
        <ul className="space-y-3 text-sm text-fg-muted">
          <li className="space-y-1">
            <div><strong className="text-fg">OKX:</strong> Account → API Keys → Create API Key (API trading, read only)</div>
            <a href="https://www.okx.com/account/my-api" target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline hover:text-accent-hover">
              https://www.okx.com/account/my-api
            </a>
          </li>
          <li className="space-y-1">
            <div><strong className="text-fg">KuCoin:</strong> Settings → API Management → Create API Key (read only)</div>
            <a href="https://www.kucoin.com/account/api" target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline hover:text-accent-hover">
              https://www.kucoin.com/account/api
            </a>
          </li>
          <li className="space-y-1">
            <div><strong className="text-fg">Binance:</strong> Account → API Keys → Create API Key (enable Spot &amp; Margin Trading Read Only)</div>
            <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline hover:text-accent-hover">
              https://www.binance.com/en/my/settings/api-management
            </a>
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-hairline bg-canvas p-4">
        <h4 className="mb-2 text-sm font-medium text-fg">Security</h4>
        <ul className="space-y-1 text-sm text-fg-muted">
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Keys are encrypted before storage</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Only read-only permissions needed</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Never sent to exchanges (only used on server)</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> You can remove keys at any time</li>
        </ul>
      </div>
    </div>
  );
}
