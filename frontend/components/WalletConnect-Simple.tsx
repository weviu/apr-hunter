'use client';

import { useAccount, useConnect, useConnectors, useDisconnect } from 'wagmi';
import type { Connector } from 'wagmi';

export function WalletConnect() {
  const { isConnected, address } = useAccount();
  const connectors = useConnectors() as Connector[];
  const { connect, isPending, variables } = useConnect();
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
    <div className="flex items-center space-x-2">
      {!connectors.length && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          No wallet connectors available
        </span>
      )}
      {connectors.map((connector) => {
        const pendingConnectorId = (variables?.connector as Connector | undefined)?.id;
        const isConnectorPending = isPending && pendingConnectorId === connector.id;

        return (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            disabled={isConnectorPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnectorPending ? 'Connecting...' : `Connect ${connector.name}`}
          </button>
        );
      })}
    </div>
  );
}

