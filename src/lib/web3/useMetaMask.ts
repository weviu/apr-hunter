'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

/**
 * MetaMask-only wallet hook built directly on wagmi (no RainbowKit).
 *
 * The single configured connector is the injected MetaMask provider, so
 * connecting talks straight to the browser extension  it launches reliably
 * instead of routing through a WalletConnect/SDK modal.
 */
export function useMetaMask() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Only the injected (MetaMask) connector is configured; fall back to the first.
  const connector = connectors.find((c) => c.type === 'injected') ?? connectors[0];

  const isInstalled =
    typeof window !== 'undefined' &&
    Boolean(
      // EIP-1193 provider that identifies as MetaMask (handles the multi-provider case).
      (window as unknown as { ethereum?: { isMetaMask?: boolean; providers?: Array<{ isMetaMask?: boolean }> } })
        .ethereum?.isMetaMask ||
        (window as unknown as { ethereum?: { providers?: Array<{ isMetaMask?: boolean }> } })
          .ethereum?.providers?.some((p) => p?.isMetaMask),
    );

  const connectMetaMask = () => {
    if (connector) connect({ connector });
  };

  return { address, chainId, isConnected, isPending, isInstalled, connectMetaMask, disconnect };
}
