'use client';

import { useState } from 'react';
import { DetectedWeb3Position } from '@/types/web3';
import { X, Loader2, Check } from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
}

interface ImportWeb3PositionDialogProps {
  isOpen: boolean;
  position: DetectedWeb3Position | null;
  portfolios: Portfolio[];
  onImport: (positionId: string, portfolioId: string) => Promise<void>;
  onClose: () => void;
}

export function ImportWeb3PositionDialog({
  isOpen,
  position,
  portfolios,
  onImport,
  onClose,
}: ImportWeb3PositionDialogProps) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(
    portfolios[0]?.id || ''
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleImport = async () => {
    if (!position || !selectedPortfolioId) return;

    setIsImporting(true);
    try {
      const posId = position.id || `${position.symbol}-${position.chain}`;
      await onImport(posId, selectedPortfolioId);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setIsImporting(false);
      }, 1500);
    } catch (error) {
      console.error('Import failed:', error);
      setIsImporting(false);
    }
  };

  if (!isOpen || !position) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Import Position</h2>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-white transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Position Details */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Asset</span>
              <span className="font-semibold text-white">{position.symbol}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="font-semibold text-white">
                {Number(position.amount).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {position.apr && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">APR</span>
                <span className="font-semibold text-emerald-400">
                  {position.apr.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Chain</span>
              <span className="font-semibold text-white">{position.chainName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Platform</span>
              <span className="font-semibold text-white">{position.protocolName}</span>
            </div>
          </div>

          {/* Portfolio Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Import to Portfolio
            </label>
            <select
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              disabled={isImporting || portfolios.length === 0}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            >
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </option>
              ))}
            </select>
          </div>

          {/* Import Button */}
          {isSuccess ? (
            <button
              disabled
              className="w-full px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Imported
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={isImporting || !selectedPortfolioId || portfolios.length === 0}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              {isImporting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isImporting ? 'Importing...' : 'Import Position'}
            </button>
          )}

          {portfolios.length === 0 && (
            <p className="text-sm text-yellow-400 text-center bg-yellow-900 bg-opacity-20 rounded p-3">
              No portfolios available. Create one first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
