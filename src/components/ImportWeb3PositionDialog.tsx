'use client';

import React, { useState } from 'react';
import { X, Loader2, Download } from 'lucide-react';
import { DetectedWeb3Position } from '@/types/web3';

interface ImportWeb3PositionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  position: DetectedWeb3Position | null;
  portfolioId?: string;
  portfolioName?: string;
  onImport: (position: DetectedWeb3Position, notes?: string) => Promise<void>;
  isImporting?: boolean;
}

export function ImportWeb3PositionDialog({
  isOpen,
  onClose,
  position,
  portfolioId: _portfolioId,
  portfolioName,
  onImport,
  isImporting = false,
}: ImportWeb3PositionDialogProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!position) return;
    setError(null);
    try {
      await onImport(position, notes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  if (!isOpen || !position) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-bold text-white">Import Position</h2>
          <button onClick={onClose} disabled={isImporting} className="text-gray-400 hover:text-white transition disabled:opacity-50">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Position Summary */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Asset</span>
              <span className="text-white font-semibold">{position.asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Protocol</span>
              <span className="text-white">{position.protocolName ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Platform / Chain</span>
              <span className="text-white">{position.platform ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Amount</span>
              <span className="text-white">{position.amount.toFixed(6)}</span>
            </div>
            {position.apr !== undefined && position.apr !== null && (
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">APR</span>
                <span className="text-blue-400 font-semibold">{(position.apr * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>

          {/* Portfolio */}
          {portfolioName && (
            <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                Importing into: <span className="text-blue-400 font-semibold">{portfolioName}</span>
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this position..."
              rows={3}
              disabled={isImporting}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleImport()}
              disabled={isImporting}
              className="flex-1 px-4 py-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
              ) : (
                <><Download className="w-4 h-4" /> Import</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
