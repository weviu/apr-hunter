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
  apr: number;            // decimal (0.05 = 5%), read on-chain from Aave
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
  _aprMap?: Map<string, number>
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

        // Real on-chain supply APR from Aave (currentLiquidityRate, ray → decimal)
        const apr = await getSupplyApr(
          client,
          addresses.aave.poolDataProvider as `0x${string}`,
          reserveAddress,
        );

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

const RAY = 1e27;

/**
 * Read the current supply APR for a reserve from the Aave PoolDataProvider.
 * `liquidityRate` is the annual supply rate in ray (1e27); APR decimal = rate / 1e27.
 */
async function getSupplyApr(
  client: PublicClient,
  poolDataProvider: `0x${string}`,
  reserveAddress: `0x${string}`,
): Promise<number> {
  try {
    const data = (await client.readContract({
      address: poolDataProvider,
      abi: [
        {
          name: 'getReserveData',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'asset', type: 'address' }],
          outputs: [
            { name: '', type: 'uint256' }, // unbacked
            { name: '', type: 'uint256' }, // accruedToTreasuryScaled
            { name: '', type: 'uint256' }, // totalAToken
            { name: '', type: 'uint256' }, // totalStableDebt
            { name: '', type: 'uint256' }, // totalVariableDebt
            { name: '', type: 'uint256' }, // liquidityRate (ray)
            { name: '', type: 'uint256' }, // variableBorrowRate
            { name: '', type: 'uint256' }, // stableBorrowRate
            { name: '', type: 'uint256' }, // averageStableBorrowRate
            { name: '', type: 'uint256' }, // liquidityIndex
            { name: '', type: 'uint256' }, // variableBorrowIndex
            { name: '', type: 'uint40' }, // lastUpdateTimestamp
          ],
        },
      ],
      functionName: 'getReserveData',
      args: [reserveAddress],
    })) as readonly bigint[];

    const liquidityRate = data[5];
    if (typeof liquidityRate !== 'bigint') return 0;
    return Number(liquidityRate) / RAY;
  } catch (error) {
    console.error('Error reading Aave supply APR:', error);
    return 0;
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
    84532: 'Base Sepolia',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
    35935: 'TractSafe',
  };
  return chainNames[chainId] || `Chain ${chainId}`;
}
