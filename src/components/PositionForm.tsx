'use client';

import { useState } from 'react';

interface PositionFormProps {
  onSubmit: (data: {
    symbol: string;
    asset: string;
    platform: string;
    platformType?: string;
    chain?: string;
    amount: number;
    apr?: number;
    riskLevel?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function PositionForm({ onSubmit, isLoading = false, onCancel }: PositionFormProps) {
  const [symbol, setSymbol] = useState('');
  const [asset, setAsset] = useState('');
  const [platform, setPlatform] = useState('');
  const [platformType, setPlatformType] = useState<'exchange' | 'defi'>('exchange');
  const [chain, setChain] = useState('');
  const [amount, setAmount] = useState('');
  const [apr, setApr] = useState('');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!symbol.trim() || !asset.trim() || !platform.trim() || !amount) {
      setError('Symbol, asset, platform, and amount are required');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    const aprNum = apr ? parseFloat(apr) : undefined;
    if (apr && (isNaN(aprNum!) || aprNum! < 0)) {
      setError('APR must be a non-negative number');
      return;
    }

    try {
      await onSubmit({
        symbol: symbol.toUpperCase().trim(),
        asset: asset.toUpperCase().trim(),
        platform: platform.trim(),
        platformType,
        chain: chain || undefined,
        amount: amountNum,
        apr: aprNum,
        riskLevel,
      });
      setSymbol('');
      setAsset('');
      setPlatform('');
      setPlatformType('exchange');
      setChain('');
      setAmount('');
      setApr('');
      setRiskLevel('medium');
    } catch (err: any) {
      setError(err.message || 'Failed to create position');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-300 mb-1">
            Symbol *
          </label>
          <input
            id="symbol"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            disabled={isLoading}
            placeholder="ETH"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 placeholder-gray-500"
          />
        </div>

        <div>
          <label htmlFor="asset" className="block text-sm font-medium text-gray-300 mb-1">
            Asset *
          </label>
          <input
            id="asset"
            type="text"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            disabled={isLoading}
            placeholder="ETHEREUM"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 placeholder-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-gray-300 mb-1">
            Platform *
          </label>
          <input
            id="platform"
            type="text"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            disabled={isLoading}
            placeholder="Binance"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 placeholder-gray-500"
          />
        </div>

        <div>
          <label htmlFor="chain" className="block text-sm font-medium text-gray-300 mb-1">
            Chain (optional)
          </label>
          <input
            id="chain"
            type="text"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            disabled={isLoading}
            placeholder="Ethereum"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 placeholder-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">
            Amount *
          </label>
          <input
            id="amount"
            type="number"
            step="0.00000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            placeholder="2.5"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 placeholder-gray-500"
          />
        </div>

        <div>
          <label htmlFor="apr" className="block text-sm font-medium text-gray-300 mb-1">
            APR (optional)
          </label>
          <input
            id="apr"
            type="number"
            step="0.01"
            value={apr}
            onChange={(e) => setApr(e.target.value)}
            disabled={isLoading}
            placeholder="4.5"
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 placeholder-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="platformType" className="block text-sm font-medium text-gray-300 mb-1">
            Type
          </label>
          <select
            id="platformType"
            value={platformType}
            onChange={(e) => setPlatformType(e.target.value as 'exchange' | 'defi')}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="exchange">Exchange</option>
            <option value="defi">DeFi</option>
          </select>
        </div>

        <div>
          <label htmlFor="riskLevel" className="block text-sm font-medium text-gray-300 mb-1">
            Risk Level
          </label>
          <select
            id="riskLevel"
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium transition"
        >
          {isLoading ? 'Adding...' : 'Add Position'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-700 text-white hover:bg-gray-800 rounded-lg disabled:opacity-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
