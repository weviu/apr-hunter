/**
 * Lido stETH position reader
 * Reads stETH balances and APR from Lido staking
 */

import { PublicClient } from 'viem';
import { ERC20_ABI } from './abis';
import { CONTRACT_ADDRESSES } from './addresses';
import { getTokenBalance, getTokenDecimals, formatBalance } from './core';

export interface LidoPosition {
  symbol: 'stETH';
  asset: 'Ethereum';
  platform: 'Lido';
  chain: string;
  amount: number;
  apr: number;
  source: string;
  lastUpdated: string;
}

/**
 * Read user's stETH balance from Lido
 */
export async function getLidoStethBalance(
  client: PublicClient,
  userAddress: `0x${string}`,
  chainId: number
): Promise<number> {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses?.lido?.steth) {
    console.warn(`Lido stETH not available on chain ${chainId}`);
    return 0;
  }

  const stethAddress = addresses.lido.steth as `0x${string}`;

  try {
    const balance = await getTokenBalance(client, stethAddress, userAddress, ERC20_ABI);
    const decimals = await getTokenDecimals(client, stethAddress, ERC20_ABI);
    return formatBalance(balance, decimals);
  } catch (error) {
    console.error('Error reading Lido stETH balance:', error);
    return 0;
  }
}

/**
 * Get Lido stETH position for a user
 */
export async function getLidoPosition(
  client: PublicClient,
  userAddress: `0x${string}`,
  chainId: number,
  aprOverride?: number
): Promise<LidoPosition | null> {
  const balance = await getLidoStethBalance(client, userAddress, chainId);

  if (balance === 0) {
    return null; // No position
  }

  const chainName = getChainName(chainId);

  return {
    symbol: 'stETH',
    asset: 'Ethereum',
    platform: 'Lido',
    chain: chainName,
    amount: balance,
    apr: aprOverride || 3.5, // Default Lido APR (should be fetched from registry)
    source: 'Lido',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get multiple Lido positions for different chains
 */
export async function getLidoPositionsMultiChain(
  clients: Record<number, PublicClient>,
  userAddress: `0x${string}`,
  aprOverride?: number
): Promise<LidoPosition[]> {
  const positions: LidoPosition[] = [];

  for (const [chainId, client] of Object.entries(clients)) {
    const position = await getLidoPosition(
      client,
      userAddress,
      Number(chainId),
      aprOverride
    );
    if (position) {
      positions.push(position);
    }
  }

  return positions;
}

function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    11155111: 'Sepolia',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
    35935: 'TractSafe',
  };
  return chainNames[chainId] || `Chain ${chainId}`;
}
