'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useConnect } from 'wagmi';
import { useWeb3PositionDetection, useDetectWeb3PositionsMutation, useAutoRefreshPositions } from '@/hooks/useWeb3PositionDetection';
import { useWeb3Chains } from '@/hooks/useWeb3Chains';
import { usePortfolios } from '@/hooks/usePortfolio';
import { groupPositionsByProtocol, DetectedWeb3Position } from '@/types/web3';
import { Web3PositionsList } from './Web3PositionsList';
import { X, Loader2, RotateCw, Wallet } from 'lucide-react';

interface Web3PositionScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onPositionsDetected?: (count: number) => void;
  defaultPortfolioId?: string;
}

export function Web3PositionScanner({
  isOpen,
  onClose,
  onPositionsDetected,
  defaultPortfolioId,
}: Web3PositionScannerProps) {
  const queryClient = useQueryClient();
  const { address: connectedAddress, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const [scanned, setScanned] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(defaultPortfolioId ?? null);
  const [importedPositions, setImportedPositions] = useState<Set<string>>(new Set());

  // Load portfolios via hook (cookies auto-sent)
  const { data: portfolios = [] } = usePortfolios({ enabled: isOpen && isConnected });

  const { selectedChainIds, toggleChain, availableChains } = useWeb3Chains();
  const { data: positions } = useWeb3PositionDetection();
  const { mutate: detectPositions, isPending } = useDetectWeb3PositionsMutation();

  // Import position mutation
  const importMutation = useMutation({
    mutationFn: async (position: DetectedWeb3Position) => {
      if (!selectedPortfolioId) throw new Error('No portfolio selected');

      const response = await fetch('/api/portfolio/import-web3-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          position,
          portfolioId: selectedPortfolioId,
          scannedChainIds: selectedChainIds,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error ?? 'Import failed');
      }

      return response.json() as Promise<{ success: boolean; data: { positionId: string } }>;
    },
    onSuccess: (data) => {
      setImportedPositions((prev) => new Set([...prev, data.data.positionId]));
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
    onError: (err: Error) => {
      setError(`Import failed: ${err.message}`);
    },
  });

  useAutoRefreshPositions(
    connectedAddress ?? undefined,
    selectedChainIds.length > 0 ? selectedChainIds : undefined
  );

  const handleScan = () => {
    if (!connectedAddress) {
      setError('Please connect your wallet first');
      return;
    }
    if (selectedChainIds.length === 0) {
      setError('Please select at least one chain');
      return;
    }

    setError(null);
    setScanned(true);
    setLastScanTime(new Date().toISOString());

    detectPositions(
      { walletAddress: connectedAddress, chainIds: selectedChainIds },
      {
        onSuccess: (data: DetectedWeb3Position[]) => {
          onPositionsDetected?.(data.length);
        },
        onError: (err: Error) => {
          setError(`Scan failed: ${err.message}`);
          setScanned(false);
        },
      }
    );
  };

  const groupedPositions = positions ? groupPositionsByProtocol(positions) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Scan Web3 Positions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Wallet Connection */}
          {!isConnected ? (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Wallet className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
              <p className="text-sm text-gray-300 mb-4">Please connect your wallet to scan for Web3 positions</p>
              <div className="grid grid-cols-2 gap-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    {connector.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                Wallet: <span className="font-mono text-blue-400 font-medium">{connectedAddress}</span>
              </p>
            </div>
          )}

          {/* Portfolio Selection */}
          {isConnected && portfolios.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Portfolio to Import To
              </label>
              <select
                value={selectedPortfolioId ?? ''}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 focus:border-blue-700 focus:outline-none"
              >
                <option value="">Choose a portfolio...</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chain Selection */}
          {isConnected && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Chains ({selectedChainIds.length} selected)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableChains.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => toggleChain(chain.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                      selectedChainIds.includes(chain.id)
                        ? 'bg-blue-800 border-blue-700 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {chain.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-400 mt-2 underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Scan Button */}
          {isConnected && (
            <>
              {!scanned || isPending ? (
                <button
                  onClick={handleScan}
                  disabled={isPending || selectedChainIds.length === 0}
                  className="w-full px-6 py-3 bg-blue-800 hover:bg-blue-900 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isPending ? 'Scanning...' : 'Scan Now'}
                </button>
              ) : (
                <button
                  onClick={handleScan}
                  disabled={isPending}
                  className="w-full px-6 py-3 bg-blue-800 hover:bg-blue-900 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  <RotateCw className="w-5 h-5" />
                  Refresh
                </button>
              )}
            </>
          )}

          {/* Results */}
          {scanned && isConnected && (
            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {isPending ? 'Scanning...' : `${groupedPositions.length} Protocol${groupedPositions.length !== 1 ? 's' : ''} Found`}
                </h3>
                {isPending && <Loader2 className="w-5 h-5 animate-spin text-blue-700" />}
              </div>

              {groupedPositions.length > 0 ? (
                <Web3PositionsList
                  groups={groupedPositions}
                  onImport={(position) => importMutation.mutate(position)}
                  isLoading={isPending || importMutation.isPending}
                  lastScanned={lastScanTime ?? undefined}
                />
              ) : (
                !isPending && (
                  <p className="text-gray-400 text-center py-8">
                    No positions detected on selected chains
                  </p>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
