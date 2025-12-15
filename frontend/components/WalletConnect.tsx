'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export function WalletConnect() {
  const { isConnected, address } = useAccount();

  return (
    <div className="flex items-center space-x-4">
      <ConnectButton />
      {isConnected && address && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
      )}
    </div>
  );
}
