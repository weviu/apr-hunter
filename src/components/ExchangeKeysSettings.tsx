'use client';

import { useState } from 'react';
import { Loader, CheckCircle, AlertCircle, Trash2, Plus } from 'lucide-react';
import { useExchangeKeysMetadata, useSaveExchangeKeys, useRemoveExchangeKeys } from '@/lib/hooks/useExchangeKeys';

const EXCHANGES = [
  { name: 'OKX', requiresPassphrase: true },
  { name: 'KuCoin', requiresPassphrase: true },
  { name: 'Binance', requiresPassphrase: false },
];

export function ExchangeKeysSettings() {
  const { data: metadata, isLoading: loadingMetadata, error: metadataError } = useExchangeKeysMetadata();
  const saveKeys = useSaveExchangeKeys();
  const removeKeys = useRemoveExchangeKeys();

  const [expandedExchange, setExpandedExchange] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    apiKey: '',
    apiSecret: '',
    passphrase: '',
  });
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
        exchange,
        apiKey: formData.apiKey.trim(),
        apiSecret: formData.apiSecret.trim(),
        passphrase: formData.passphrase.trim() || undefined,
      },
      {
        onSuccess: () => {
          setFormData({ apiKey: '', apiSecret: '', passphrase: '' });
          setExpandedExchange(null);
        },
        onError: (err: any) => {
          setError(err.message || 'Failed to save keys');
        },
      }
    );
  };

  const handleRemoveKeys = (exchange: string) => {
    if (confirm(`Are you sure you want to remove ${exchange} API keys?`)) {
      removeKeys.mutate(exchange, {
        onError: (err: any) => {
          setError(err.message || 'Failed to remove keys');
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Exchange API Keys</h2>
        <p className="text-gray-400">
          Securely store your exchange API keys to import your real holdings. Keys are encrypted and never shared.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {metadataError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-red-400">Failed to load exchange keys</div>
        </div>
      )}

      {loadingMetadata ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-6 w-6 text-emerald-500 animate-spin mr-2" />
          <span className="text-gray-400">Loading...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {EXCHANGES.map((exchange) => {
            const isConfigured = metadata?.[exchange.name]?.configured || false;
            const lastUpdated = metadata?.[exchange.name]?.lastUpdated;
            const isExpanded = expandedExchange === exchange.name;
            const isSaving = saveKeys.isPending && saveKeys.variables?.exchange === exchange.name;
            const isRemoving = removeKeys.isPending && removeKeys.variables === exchange.name;
            const isLoading = isSaving || isRemoving;

            return (
              <div key={exchange.name} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedExchange(isExpanded ? null : exchange.name)}
                  disabled={isLoading}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{exchange.name}</h3>
                    {isConfigured && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      {isConfigured ? (
                        <>
                          Connected
                          {lastUpdated && (
                            <span className="block text-xs">
                              {new Date(lastUpdated).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : (
                        'Not configured'
                      )}
                    </p>
                  </div>
                </button>

                {/* Expanded Form */}
                {isExpanded && (
                  <div className="border-t border-gray-700 bg-gray-900 p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                      <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="Enter your API key"
                        disabled={isLoading}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">API Secret</label>
                      <input
                        type="password"
                        value={formData.apiSecret}
                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                        placeholder="Enter your API secret"
                        disabled={isLoading}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                      />
                    </div>

                    {exchange.requiresPassphrase && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Passphrase</label>
                        <input
                          type="password"
                          value={formData.passphrase}
                          onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                          placeholder="Enter your passphrase"
                          disabled={isLoading}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        />
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleSaveKeys(exchange.name)}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Save Keys
                          </>
                        )}
                      </button>

                      {isConfigured && (
                        <button
                          onClick={() => handleRemoveKeys(exchange.name)}
                          disabled={isLoading}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 disabled:opacity-50 rounded-lg transition font-medium flex items-center gap-2"
                        >
                          {isRemoving ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </>
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

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-3">How to find your API keys</h4>
        <ul className="text-sm text-blue-200 space-y-3">
          <li className="space-y-1">
            <div><strong>OKX:</strong> Account → API Keys → Create API Key (API trading, read only)</div>
            <a href="https://www.okx.com/account/my-api" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline text-xs">
              https://www.okx.com/account/my-api
            </a>
          </li>
          <li className="space-y-1">
            <div><strong>KuCoin:</strong> Settings → API Management → Create API Key (read only, no withdrawal)</div>
            <a href="https://www.kucoin.com/account/api" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline text-xs">
              https://www.kucoin.com/account/api
            </a>
          </li>
          <li className="space-y-1">
            <div><strong>Binance:</strong> Account → API Keys → Create API Key (enable Spot & Margin Trading Read Only)</div>
            <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline text-xs">
              https://www.binance.com/en/my/settings/api-management
            </a>
          </li>
        </ul>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <h4 className="font-semibold text-amber-300 mb-2">Security</h4>
        <ul className="text-sm text-amber-200 space-y-1">
          <li>✓ Keys are encrypted before storage</li>
          <li>✓ Only read-only permissions needed</li>
          <li>✓ Never sent to exchanges (only used on server)</li>
          <li>✓ You can remove keys at any time</li>
        </ul>
      </div>
    </div>
  );
}
