'use client';

import { useState } from 'react';

interface PortfolioFormProps {
  onSubmit: (data: {
    name: string;
    description?: string;
    type: 'web2' | 'web3';
    walletAddress?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function PortfolioForm({ onSubmit, isLoading = false, onCancel }: PortfolioFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'web2' | 'web3'>('web2');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Portfolio name is required');
      return;
    }

    if (type === 'web3' && !walletAddress.trim()) {
      setError('Wallet address is required for Web3 portfolios');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        walletAddress: type === 'web3' ? walletAddress.trim() : undefined,
      });
      setName('');
      setDescription('');
      setType('web2');
      setWalletAddress('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create portfolio';
      setError(errorMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
          Portfolio Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          placeholder="e.g., My Binance Staking"
          className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 placeholder-gray-500"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          placeholder="Add notes about this portfolio..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 resize-none placeholder-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Portfolio Type *</label>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="web2"
              checked={type === 'web2'}
              onChange={(e) => setType(e.target.value as 'web2' | 'web3')}
              disabled={isLoading}
              className="mr-2 accent-emerald-500"
            />
            <span className="text-sm">
              <span className="font-medium text-white">Web2 (Manual)</span>
              <span className="text-gray-400 ml-1">Track positions manually</span>
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="web3"
              checked={type === 'web3'}
              onChange={(e) => setType(e.target.value as 'web2' | 'web3')}
              disabled={isLoading}
              className="mr-2 accent-emerald-500"
            />
            <span className="text-sm">
              <span className="font-medium text-white">Web3 (Wallet-Connected)</span>
              <span className="text-gray-400 ml-1">Sync with connected wallet</span>
            </span>
          </label>
        </div>
      </div>

      {type === 'web3' && (
        <div>
          <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-300 mb-1">
            Wallet Address *
          </label>
          <input
            id="walletAddress"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            disabled={isLoading}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 font-mono text-sm placeholder-gray-500"
          />
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium transition"
        >
          {isLoading ? 'Creating...' : 'Create Portfolio'}
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
