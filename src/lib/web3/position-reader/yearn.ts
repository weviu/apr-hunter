/**
 * Yearn vault position reader
 * Reads yToken balances and APR from Yearn vaults
 */

import { PublicClient } from 'viem';
import { YEARN_VAULT_ABI } from './abis';
import { getTokenBalance, getTokenDecimals, formatBalance } from './core';

export interface YearnPosition {
  symbol: string;
  asset: string;
  platform: 'Yearn';
  chain: string;
  amount: number;
  shareAmount: number; // yToken amount
  apr: number;
  vaultAddress: string;
  source: string;
  lastUpdated: string;
}

/**
 * Common Yearn vault addresses on Ethereum mainnet
 * In production, you'd fetch these dynamically from the registry
 */
const YEARN_VAULTS_ETHEREUM: Record<string, { address: `0x${string}`; asset: string; symbol: string }> = {
  'yvDAI': {
    address: '0x19b3b999e4dac6f2d63f7f024a01e1a5a1f4e3f5',
    asset: 'DAI',
    symbol: 'yvDAI',
  },
  'yvUSDC': {
    address: '0xa354f35829ae975e850e23e9615b11da1b3dc4de',
    asset: 'USDC',
    symbol: 'yvUSDC',
  },
  'yvUSDT': {
    address: '0x2b5eb350dfc3d6f88e9a38f6ad91e11a1bb59598',
    asset: 'USDT',
    symbol: 'yvUSDT',
  },
  'yvETH': {
    address: '0xa9fe4601811213c340e850ea305481aff02144dd',
    asset: 'ETH',
    symbol: 'yvETH',
  },
};

/**
 * Read user's yToken balance for a specific vault
 */
export async function getYearnVaultBalance(
  client: PublicClient,
  vaultAddress: `0x${string}`,
  userAddress: `0x${string}`
): Promise<{ shares: number; underlying: number }> {
  try {
    // Get yToken balance (shares)
    const balance = await getTokenBalance(client, vaultAddress, userAddress, YEARN_VAULT_ABI);
    const decimals = await getTokenDecimals(client, vaultAddress, YEARN_VAULT_ABI);
    const shares = formatBalance(balance, decimals);

    // Get price per share to calculate underlying amount
    const pricePerShare = (await client.readContract({
      address: vaultAddress,
      abi: YEARN_VAULT_ABI,
      functionName: 'pricePerShare',
      args: [],
    })) as bigint;

    const underlying = shares * formatBalance(pricePerShare, decimals);

    return { shares, underlying };
  } catch (error) {
    console.error('Error reading Yearn vault balance:', error);
    return { shares: 0, underlying: 0 };
  }
}

/**
 * Get Yearn positions for a user on Ethereum
 */
export async function getYearnPositions(
  client: PublicClient,
  userAddress: `0x${string}`,
  chainId: number,
  aprMap?: Map<string, number>
): Promise<YearnPosition[]> {
  // Only Ethereum mainnet supported for now
  if (chainId !== 1) {
    return [];
  }

  const positions: YearnPosition[] = [];
  const chainName = getChainName(chainId);

  for (const [key, vault] of Object.entries(YEARN_VAULTS_ETHEREUM)) {
    try {
      const { shares, underlying } = await getYearnVaultBalance(
        client,
        vault.address,
        userAddress
      );

      if (underlying === 0) continue;

      const aprKey = `yearn-${vault.asset}`;
      const apr = aprMap?.get(aprKey) || 8.5; // Default Yearn APR estimate

      positions.push({
        symbol: vault.symbol,
        asset: vault.asset,
        platform: 'Yearn',
        chain: chainName,
        amount: underlying,
        shareAmount: shares,
        apr,
        vaultAddress: vault.address,
        source: 'Yearn',
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error reading Yearn vault ${key}:`, error);
      continue;
    }
  }

  return positions;
}

/**
 * Get all supported Yearn vaults for a chain
 * In production, this would fetch from the Yearn registry dynamically
 */
export function getSupportedYearnVaults(chainId: number) {
  if (chainId === 1) {
    return YEARN_VAULTS_ETHEREUM;
  }
  return {};
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
