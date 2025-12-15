'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ConnectWallet } from '@connectwallet/react';

export function WalletConnect() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <ConnectWallet.Button />
    </div>
  );
}

