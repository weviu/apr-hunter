'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import {
  useExchangeKeysMetadata,
  useSaveExchangeKeys,
  useRemoveExchangeKeys,
  useVerifyExchangeKeys,
} from '@/hooks/useExchangeKeys';
import { Button } from '@/components/ui';

interface FieldRule {
  /** Loose length bounds  advisory, catches obvious paste mistakes. */
  min: number;
  max: number;
  /** Optional shape check. Kept conservative to avoid rejecting valid keys. */
  pattern?: RegExp;
  /** Human-readable hint shown when the value fails the rule. */
  hint: string;
}

interface ExchangeConfig {
  name: string;
  requiresPassphrase: boolean;
  apiKey: FieldRule;
  apiSecret: FieldRule;
}

// Format rules are intentionally loose  the authoritative check is the
// server-side "Test connection" / Save verification against the live API.
const EXCHANGES: ExchangeConfig[] = [
  {
    name: 'OKX',
    requiresPassphrase: true,
    apiKey: {
      min: 36,
      max: 36,
      pattern: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      hint: 'OKX API keys look like a UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).',
    },
    apiSecret: { min: 16, max: 128, hint: 'OKX secret looks too short  copy the full Secret Key.' },
  },
  {
    name: 'KuCoin',
    requiresPassphrase: true,
    apiKey: { min: 16, max: 64, hint: 'KuCoin API keys are a long alphanumeric string.' },
    apiSecret: { min: 16, max: 128, hint: 'KuCoin secret looks too short  copy the full Secret Key.' },
  },
  {
    name: 'Binance',
    requiresPassphrase: false,
    apiKey: { min: 30, max: 128, hint: 'Binance API keys are a 64-character alphanumeric string.' },
    apiSecret: { min: 30, max: 128, hint: 'Binance secret is a 64-character alphanumeric string (use a System-generated HMAC key).' },
  },
];

/** Loose client-side format check. Returns an error message or null. */
function validateFormat(config: ExchangeConfig, data: { apiKey: string; apiSecret: string; passphrase: string }): string | null {
  const checkField = (label: string, value: string, rule: FieldRule): string | null => {
    if (/\s/.test(value)) return `${label} should not contain spaces  check for an extra character when pasting.`;
    if (value.length < rule.min || value.length > rule.max) return rule.hint;
    if (rule.pattern && !rule.pattern.test(value)) return rule.hint;
    return null;
  };

  return (
    checkField('API Key', data.apiKey, config.apiKey) ??
    checkField('API Secret', data.apiSecret, config.apiSecret) ??
    (config.requiresPassphrase && /\s/.test(data.passphrase)
      ? 'Passphrase should not contain spaces.'
      : null)
  );
}

/** Read-only masked field shown for a saved card  dots match the stored key length. */
function MaskedField({ label, length, hint }: { label: string; length: number; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg-muted">{label}</label>
      <input
        type="text"
        readOnly
        disabled
        value={'•'.repeat(Math.max(length, 0))}
        className={fieldClass}
      />
      {hint && <p className="mt-1.5 text-xs text-fg-faint">{hint}</p>}
    </div>
  );
}

/** The api client throws Errors whose message is the raw JSON envelope. */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    return parsed.error || fallback;
  } catch {
    return err.message || fallback;
  }
}

const fieldClass =
  'w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-fg ' +
  'placeholder:text-fg-faint transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50';

export function ExchangeKeysSettings() {
  const { data: keysList = [], isLoading: loadingMetadata, error: metadataError } = useExchangeKeysMetadata();
  const saveKeys = useSaveExchangeKeys();
  const removeKeys = useRemoveExchangeKeys();
  const verifyKeys = useVerifyExchangeKeys();

  // Build a lookup: exchange name → entry
  const metadata = Object.fromEntries(keysList.map((k) => [k.exchange, k]));

  const [expandedExchange, setExpandedExchange] = useState<string | null>(null);
  const [formData, setFormData] = useState({ apiKey: '', apiSecret: '', passphrase: '' });
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'success'>('idle');

  const resetForm = () => {
    setFormData({ apiKey: '', apiSecret: '', passphrase: '' });
    setError(null);
    setTestStatus('idle');
  };

  /** Shared front-door validation: required fields + loose format check. */
  const validateForm = (exchange: string): ExchangeConfig | null => {
    const config = EXCHANGES.find((e) => e.name === exchange);
    if (!config) return null;

    if (!formData.apiKey.trim() || !formData.apiSecret.trim()) {
      setError('API Key and Secret are required');
      return null;
    }
    if (config.requiresPassphrase && !formData.passphrase.trim()) {
      setError('Passphrase is required for ' + exchange);
      return null;
    }

    const formatError = validateFormat(config, {
      apiKey: formData.apiKey.trim(),
      apiSecret: formData.apiSecret.trim(),
      passphrase: formData.passphrase.trim(),
    });
    if (formatError) {
      setError(formatError);
      return null;
    }
    return config;
  };

  const payloadFor = (exchange: string) => ({
    exchange: exchange.toLowerCase(),
    apiKey: formData.apiKey.trim(),
    apiSecret: formData.apiSecret.trim(),
    passphrase: formData.passphrase.trim() || undefined,
  });

  const handleTestConnection = (exchange: string, isConfigured: boolean) => {
    setError(null);
    setTestStatus('idle');

    // Saved card: test the stored keys (no plaintext on the client) by sending
    // only the exchange. New entry: validate and test the typed values.
    const payload = isConfigured ? { exchange: exchange.toLowerCase() } : payloadFor(exchange);
    if (!isConfigured && !validateForm(exchange)) return;

    verifyKeys.mutate(payload, {
      onSuccess: () => setTestStatus('success'),
      onError: (err) => setError(extractErrorMessage(err, 'Connection test failed')),
    });
  };

  const handleSaveKeys = async (exchange: string) => {
    setError(null);
    setTestStatus('idle');
    if (!validateForm(exchange)) return;

    saveKeys.mutate(payloadFor(exchange), {
      onSuccess: () => {
        resetForm();
        setExpandedExchange(null);
      },
      onError: (err) => {
        setError(extractErrorMessage(err, 'Failed to save keys'));
      },
    });
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
            const isTesting = verifyKeys.isPending && verifyKeys.variables?.exchange === exchange.name.toLowerCase();
            const isBusy = isSaving || isRemoving || isTesting;

            return (
              <div key={exchange.name} className="overflow-hidden rounded-lg border border-hairline bg-surface">
                <button
                  onClick={() => {
                    resetForm();
                    setExpandedExchange(isExpanded ? null : exchange.name);
                  }}
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
                    {isConfigured ? (
                      <>
                        <MaskedField label="API Key" length={entry?.apiKeyLength ?? 0} />
                        <MaskedField label="API Secret" length={entry?.apiSecretLength ?? 0} />
                        {exchange.requiresPassphrase && (
                          <MaskedField
                            label="API Passphrase"
                            length={entry?.passphraseLength ?? 0}
                            hint="The passphrase you set when creating the API key  not your account login or trading password."
                          />
                        )}
                        <p className="text-xs text-fg-faint">
                          Keys are saved and locked. Use <span className="font-medium text-fg-muted">Test connection</span> to
                          re-check them, or <span className="font-medium text-fg-muted">Remove</span> to replace them.
                        </p>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-fg-muted">API Key</label>
                          <input
                            type="password"
                            value={formData.apiKey}
                            onChange={(e) => {
                              setFormData({ ...formData, apiKey: e.target.value });
                              setTestStatus('idle');
                            }}
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
                            onChange={(e) => {
                              setFormData({ ...formData, apiSecret: e.target.value });
                              setTestStatus('idle');
                            }}
                            placeholder="Enter your API secret"
                            disabled={isBusy}
                            className={fieldClass}
                          />
                        </div>

                        {exchange.requiresPassphrase && (
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-fg-muted">API Passphrase</label>
                            <input
                              type="password"
                              value={formData.passphrase}
                              onChange={(e) => {
                                setFormData({ ...formData, passphrase: e.target.value });
                                setTestStatus('idle');
                              }}
                              placeholder="Enter your API passphrase"
                              disabled={isBusy}
                              className={fieldClass}
                            />
                            <p className="mt-1.5 text-xs text-fg-faint">
                              The passphrase you set when creating the API key  not your account login or trading password.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {!isConfigured && (
                        <Button
                          onClick={() => void handleSaveKeys(exchange.name)}
                          loading={isSaving}
                          loadingText="Saving…"
                        >
                          Save Keys
                        </Button>
                      )}

                      <button
                        onClick={() => handleTestConnection(exchange.name, isConfigured)}
                        disabled={isBusy}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-hairline bg-surface px-4 text-sm font-medium text-fg transition hover:bg-surface-hover disabled:opacity-50"
                      >
                        {isTesting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Testing…</>
                        ) : (
                          'Test connection'
                        )}
                      </button>

                      {testStatus === 'success' && !isBusy && (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                          <CheckCircle className="h-4 w-4" /> Connection verified
                        </span>
                      )}

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
            <div><strong className="text-fg">Binance:</strong> Account → API Keys → Create API Key → choose <strong className="text-fg">System generated</strong> (HMAC), then enable Spot &amp; Margin Trading (Read Only)</div>
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
