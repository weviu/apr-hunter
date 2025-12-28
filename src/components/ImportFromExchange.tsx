'use client';

import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { useSupportedExchanges, useExchangeHoldings } from '@/lib/hooks/useExchangeHoldings';
import { useAuth } from '@/lib/auth';
import { CexHolding } from '@/lib/exchanges/cex-adapter';

interface ImportFromExchangeProps {
  onImport: (holding: CexHolding) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function ImportFromExchange({ onImport, onClose, isLoading = false }: ImportFromExchangeProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [selectedHolding, setSelectedHolding] = useState<CexHolding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: exchanges, isLoading: exchangesLoading } = useSupportedExchanges();
  const { data: holdings, isLoading: holdingsLoading, error: holdingsError } = useExchangeHoldings(selectedExchange, {
    enabled: !!selectedExchange && !!user,
  });

  const handleImport = async () => {
    if (!selectedHolding) return;

    setImporting(true);
    try {
      await onImport(selectedHolding);
      setSelectedHolding(null);
      setSelectedExchange('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import position');
    } finally {
      setImporting(false);
    }
  };

  const handleSelectHolding = (holding: CexHolding) => {
    setSelectedHolding(holding);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Import from Exchange</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300 transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!authLoading && !user && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded">
              You must be logged in to import holdings. Please log in and try again.
            </div>
          )}

          {authLoading && (
            <div className="text-center py-8 text-gray-400">
              <Loader size={20} className="animate-spin mx-auto mb-2" />
              Loading...
            </div>
          )}

          {user && (
            <>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
                  {error}
                </div>
              )}

              {holdingsError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
                  Failed to fetch holdings: {holdingsError instanceof Error ? holdingsError.message : 'Unknown error'}
                </div>
              )}

              {/* Step 1: Select Exchange */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Exchange</label>
                <div className="grid grid-cols-1 gap-2">
                  {exchangesLoading ? (
                    <div className="text-center py-4 text-gray-400">Loading exchanges...</div>
                  ) : exchanges && exchanges.length > 0 ? (
                    exchanges.map((exchange) => (
                      <button
                        key={exchange}
                        onClick={() => {
                          setSelectedExchange(exchange);
                          setSelectedHolding(null);
                          setError(null);
                        }}
                        className={`p-3 rounded-lg border-2 transition text-left font-medium ${
                          selectedExchange === exchange
                            ? 'border-emerald-500 bg-emerald-500/10 text-white'
                            : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {exchange}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">No exchanges available</div>
                  )}
                </div>
              </div>

              {/* Step 2: Select Holdings */}
              {selectedExchange && (
                <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Your Holdings</label>
              {holdingsLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader size={20} className="animate-spin mr-2" />
                  Fetching holdings from {selectedExchange}...
                </div>
              ) : holdings && holdings.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {holdings.map((holding, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectHolding(holding)}
                      className={`w-full p-3 rounded-lg border-2 transition text-left ${
                        selectedHolding === holding
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{holding.symbol}</p>
                          <p className="text-xs text-gray-400">{holding.asset}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{holding.amount.toFixed(6)}</p>
                          <p className="text-xs text-gray-400">
                            {holding.platform}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No holdings found on {selectedExchange}</div>
              )}
            </div>
          )}

          {/* Selected Holding Preview */}
          {selectedHolding && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Selected Position:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Symbol</p>
                  <p className="font-semibold text-white">{selectedHolding.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Amount</p>
                  <p className="font-semibold text-white">{selectedHolding.amount.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Platform</p>
                  <p className="font-semibold text-white">{selectedHolding.platform}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Type</p>
                  <p className="font-semibold text-white capitalize">{selectedHolding.platformType}</p>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={importing || isLoading || authLoading}
            className="flex-1 px-4 py-2 border border-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedHolding || importing || isLoading || authLoading || !user}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <Loader size={18} className="animate-spin" />
                Importing...
              </>
            ) : (
              'Import Position'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
