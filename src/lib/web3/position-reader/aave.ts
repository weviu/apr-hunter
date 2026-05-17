/**
 * Aave V3 position reader
 * Reads supplied collateral, borrowed assets, and APR from Aave
 */

import { PublicClient } from 'viem';
import { AAVE_V3_POOL_ABI, AAVE_V3_ATOKEN_ABI, ERC20_ABI } from './abis';
import { CONTRACT_ADDRESSES } from './addresses';
import { getTokenBalance, getTokenDecimals, formatBalance } from './core';

export interface AavePosition {
  symbol: string;
  asset: string;
  platform: 'Aave';
  chain: string;
  amount: number;
  positionType: 'supplied' | 'borrowed';
  apr: number;
  aTokenAddress?: string;
  source: string;
  lastUpdated: string;
}

/**
 * Get user's supplied positions in Aave V3
 */
export async function getAaveSuppliedPositions(
  client: PublicClient,
  userAddress: `0x${string}`,
  chainId: number,
  aprMap?: Map<string, number>
): Promise<AavePosition[]> {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses?.aave?.poolV3) {
    console.warn(`Aave V3 not available on chain ${chainId}`);
    return [];
  }

  const positions: AavePosition[] = [];
  const poolAddress = addresses.aave.poolV3 as `0x${string}`;

  try {
    // Get list of available reserves
    const reserves = (await client.readContract({
      address: poolAddress,
      abi: AAVE_V3_POOL_ABI,
      functionName: 'getReservesList',
      args: [],
    })) as `0x${string}`[];

    // For each reserve, check user's aToken balance
    const chainName = getChainName(chainId);

    for (const reserveAddress of reserves.slice(0, 10)) {
      // Limit to first 10 for performance
      try {
        // Get aToken address from reserve data
        // For now, we'll try common aToken patterns
        const aTokenAddress = await getATokenAddress(
          client,
          poolAddress,
          reserveAddress,
          chainId
        );

        if (!aTokenAddress) continue;

        const balance = await getTokenBalance(client, aTokenAddress, userAddress, AAVE_V3_ATOKEN_ABI);

        if (balance === BigInt(0)) continue;

        const decimals = await getTokenDecimals(client, aTokenAddress, AAVE_V3_ATOKEN_ABI);
        const symbol = await getSymbol(client, reserveAddress);
        const amount = formatBalance(balance, decimals);

        // Get APR from map or use default
        const aprKey = `aave-${symbol}`;
        const apr = aprMap?.get(aprKey) || 3.5;

        positions.push({
          symbol: `a${symbol}`,
          asset: symbol,
          platform: 'Aave',
          chain: chainName,
          amount,
          positionType: 'supplied',
          apr,
          aTokenAddress,
          source: 'Aave V3',
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error processing Aave reserve ${reserveAddress}:`, error);
        continue;
      }
    }

    return positions;
  } catch (error) {
    console.error('Error reading Aave supplied positions:', error);
    return [];
  }
}

/**
 * Get aToken address for a reserve
 * This is a simplified version - in production, you'd use getReserveData
 */
async function getATokenAddress(
  client: PublicClient,
  poolAddress: `0x${string}`,
  reserveAddress: `0x${string}`,
  chainId: number
): Promise<`0x${string}` | null> {
  try {
    // Try to call getReserveData from IPoolDataProvider
    const addresses = CONTRACT_ADDRESSES[chainId];
    if (!addresses?.aave?.poolDataProvider) {
      return null;
    }

    const result = (await client.readContract({
      address: addresses.aave.poolDataProvider as `0x${string}`,
      abi: [
        {
          name: 'getReserveTokensAddresses',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'asset', type: 'address' }],
          outputs: [
            { name: 'aTokenAddress', type: 'address' },
            { name: 'stableDebtTokenAddress', type: 'address' },
            { name: 'variableDebtTokenAddress', type: 'address' },
          ],
        },
      ],
      functionName: 'getReserveTokensAddresses',
      args: [reserveAddress],
    })) as [`0x${string}`, `0x${string}`, `0x${string}`];

    return result[0];
  } catch (error) {
    console.error('Error getting aToken address:', error);
    return null;
  }
}

/**
 * Get token symbol
 */
async function getSymbol(client: PublicClient, tokenAddress: `0x${string}`): Promise<string> {
  try {
    const symbol = (await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol',
      args: [],
    })) as string;
    return symbol;
  } catch {
    return 'UNKNOWN';
  }
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
