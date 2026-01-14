'use client';

import { useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useWeb3PositionDetection, useDetectWeb3PositionsMutation, useAutoRefreshPositions } from '@/lib/hooks/useWeb3PositionDetection';
import { useWeb3Chains } from '@/lib/hooks/useWeb3Chains';
import { useAuth } from '@/lib/auth';
import { groupPositionsByProtocol, DetectedWeb3Position } from '@/types/web3';
import { Web3PositionsList } from './Web3PositionsList';
import { X, Loader2, RotateCw, Wallet } from 'lucide-react';

interface Web3PositionScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onPositionsDetected?: (count: number) => void;
}

export function Web3PositionScanner({
  isOpen,
  onClose,
  onPositionsDetected,
}: Web3PositionScannerProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { token } = useAuth();
  const [scanned, setScanned] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('[Web3PositionScanner] Token:', token ? 'present' : 'MISSING');
  if (!token) {
    console.warn('[Web3PositionScanner] No auth token available - scan will fail');
  }

  const { selectedChainIds, toggleChain, availableChains } =
    useWeb3Chains();
  const { data: positions } = useWeb3PositionDetection();
  const { mutate: detectPositions, isPending } = useDetectWeb3PositionsMutation(token || undefined);
  
  // Auto-refresh is handled by the hook, we just need to manage scan state
  useAutoRefreshPositions(
    connectedAddress || undefined,
    selectedChainIds.length > 0 ? selectedChainIds : undefined
  );

  const handleScan = async () => {
    if (!connectedAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (selectedChainIds.length === 0) {
      alert('Please select at least one chain');
      return;
    }

    setError(null);
    setScanned(true);
    setLastScanTime(new Date().toISOString());

    detectPositions(
      { walletAddress: connectedAddress, chainIds: selectedChainIds },
      {
        onSuccess: (data: DetectedWeb3Position[]) => {
          console.log('[Web3PositionScanner] Scan successful:', data);
          onPositionsDetected?.(data.length);
        },
        onError: (error: Error) => {
          console.error('[Web3PositionScanner] Scan error:', error);
          setError(`Scan failed: ${error.message}`);
          setScanned(false);
        },
      }
    );
  };

  const handleManualRefresh = () => {
    setLastScanTime(new Date().toISOString());
    handleScan();
  };

  const groupedPositions = positions
    ? groupPositionsByProtocol(positions)
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Scan Web3 Positions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Wallet Connection Section */}
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
          ) : isConnected ? (
            <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                Wallet: <span className="font-mono text-emerald-400 font-medium">{connectedAddress}</span>
              </p>
            </div>
          ) : null}

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
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {chain.name}
                </button>
              ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-500 hover:text-red-400 mt-2 underline"
              >
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
                  className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isPending ? 'Scanning...' : 'Scan Now'}
                </button>
              ) : (
                <button
                  onClick={handleManualRefresh}
                  disabled={isPending}
                  className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
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
                {isPending && <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />}
              </div>

              {groupedPositions.length > 0 ? (
                <Web3PositionsList
                  groups={groupedPositions}
                  onImport={(position) => {
                    // Auto-import: just log for now, will be replaced with actual import logic
                    console.log('Auto-importing position:', position);
                  }}
                  isLoading={isPending}
                  lastScanned={lastScanTime || undefined}
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
