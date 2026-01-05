'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useDetectWeb3Positions } from '@/lib/hooks/useDetectWeb3Positions';

interface DetectedPosition {
  symbol: string;
  asset: string;
  platform: string;
  platformType?: string;
  chain?: string;
  amount: number;
  apr?: number;
  isActive: boolean;
  source?: string;
}

interface PortfolioFormProps {
  onSubmit: (data: {
    name: string;
    description?: string;
    type: 'web2' | 'web3';
    walletAddress?: string;
    detectedPositions?: DetectedPosition[];
  }) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

// Chain ID to name mapping
const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  80002: 'Polygon Amoy Testnet',
  137: 'Polygon Mainnet',
  10: 'Optimism',
  42161: 'Arbitrum',
  8453: 'Base',
};

export function PortfolioForm({ onSubmit, isLoading = false, onCancel }: PortfolioFormProps) {
  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'web2' | 'web3'>('web2');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDetection, setShowDetection] = useState(false);

  // Auto-detect Web3 positions when wallet is connected and type is web3
  const { data: detectedPositions = [], isLoading: isDetecting } = useDetectWeb3Positions();

  // Auto-fill wallet address when wallet is connected and form type is web3
  useEffect(() => {
    if (type === 'web3' && connectedAddress && !walletAddress) {
      setWalletAddress(connectedAddress);
      setShowDetection(true);
    }
  }, [type, connectedAddress, walletAddress]);

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
        detectedPositions: type === 'web3' ? detectedPositions : undefined,
      });
      setName('');
      setDescription('');
      setType('web2');
      setWalletAddress('');
      setShowDetection(false);
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
            readOnly
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-700 bg-gray-700 text-gray-400 rounded-lg font-mono text-sm cursor-not-allowed"
          />
          {isConnected && connectedAddress ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-emerald-400">Connected wallet auto-filled</p>
              <p className="text-xs text-gray-500">
                Chain: {CHAIN_NAMES[chainId || 1] || `Unknown (ID: ${chainId})`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-red-400 mt-1">Please connect your wallet first</p>
          )}
        </div>
      )}

      {type === 'web3' && showDetection && (
        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Auto-Detected Positions
              {isDetecting && <span className="text-xs text-emerald-400 ml-2">Scanning...</span>}
            </h3>
          </div>

          {isDetecting ? (
            <div className="text-sm text-gray-400">Scanning wallet for positions...</div>
          ) : detectedPositions.length > 0 ? (
            <div className="space-y-2">
              {detectedPositions.map((position, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-700/50 rounded">
                  <div>
                    <div className="font-medium text-white">{position.amount.toFixed(4)} {position.symbol}</div>
                    <div className="text-xs text-gray-400">{position.platform}</div>
                  </div>
                  {position.apr && (
                    <div className="text-right">
                      <div className="text-emerald-400 font-semibold">{position.apr.toFixed(2)}%</div>
                      <div className="text-xs text-gray-400">APR</div>
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-3">
                These positions will be imported when you create the portfolio.
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-400">No positions detected in this wallet.</div>
          )}
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
