/**
 * ERC20 token balance reader + Native currency detection
 * Reads balances for whitelisted ERC20 tokens and native currencies across chains
 */

import { PublicClient } from 'viem';
import { ERC20_ABI } from './abis';
import { getTokenBalance, getTokenDecimals, formatBalance } from './core';
import { getMongoDb } from '@/lib/db/mongodb';

export interface ERC20Position {
  symbol: string;
  asset: string;
  platform: string;
  chain: string;
  amount: number;
  apr: number;
  source: string;
  lastUpdated: string;
}

/**
 * Token whitelist per chain
 * Only these tokens will be checked for balances
 */
interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  name: string;
}

export const ERC20_WHITELIST: Record<number, TokenInfo[]> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
    {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
    },
    {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      decimals: 18,
      name: 'Dai Stablecoin',
    },
  ],

  // Sepolia Testnet
  11155111: [
    {
      address: '0x6aed99924caf0330e03df5f188ee1b0b6a4bda53',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
  ],

  // Polygon
  137: [
    {
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
    {
      address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
    },
    {
      address: '0x8f3cf7ad23cd3cadbd9735aff958023d60c2ae07',
      symbol: 'DAI',
      decimals: 18,
      name: 'Dai Stablecoin',
    },
  ],

  // Arbitrum
  42161: [
    {
      address: '0xff970a61a04b1ca14834a43f5de4533ebddb5f86',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
    {
      address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
    },
    {
      address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
      symbol: 'DAI',
      decimals: 18,
      name: 'Dai Stablecoin',
    },
  ],

  // Optimism
  10: [
    {
      address: '0x7f5c764cbc14f9669b88837ca1490cccf460b4b8',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
    {
      address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
    },
    {
      address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
      symbol: 'DAI',
      decimals: 18,
      name: 'Dai Stablecoin',
    },
  ],

  // Polygon Amoy Testnet
  80002: [
    {
      address: '0x2c89bae432a2346138c8376144b8fee1536de51b',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
    {
      address: '0x165387ee7575da08fc422b17b86d67e419b10df3',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
    },
  ],

  // TractSafe Testnet
  35935: [
    {
      address: '0x0000000000000000000000000000000000000002',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
  ],
};

/**
 * Get APR for a token from MongoDB
 */
async function getTokenApr(symbol: string, platform: string = 'ERC20'): Promise<number> {
  try {
    const db = await getMongoDb();
    if (!db) return 0;

    // Look for APR data in our apr_data collection
    const aprData = await db.collection('apr_data').findOne({
      asset: { $regex: new RegExp(`^${symbol}$`, 'i') },
    });

    if (aprData && typeof aprData.apr === 'number') {
      return aprData.apr;
    }
  } catch (error) {
    console.error(`Error fetching APR for ${symbol}:`, error);
  }

  // Default APRs for stablecoins when not found
  const defaultAprs: Record<string, number> = {
    USDC: 3.5,
    USDT: 3.5,
    DAI: 3.0,
    TRCT: 0, // Default to 0 if not found
  };

  return defaultAprs[symbol] || 0;
}

/**
 * Get chain name from chain ID
 */
function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    11155111: 'Sepolia',
    137: 'Polygon',
    80002: 'Polygon Amoy',
    42161: 'Arbitrum',
    10: 'Optimism',
    35935: 'TractSafe',
  };
  return chainNames[chainId] || `Chain ${chainId}`;
}

/**
 * Detect ERC20 token balances for a wallet
 */
export async function getERC20Positions(
  client: PublicClient,
  userAddress: `0x${string}`,
  chainId: number
): Promise<ERC20Position[]> {
  const positions: ERC20Position[] = [];
  const whitelist = ERC20_WHITELIST[chainId] || [];

  if (whitelist.length === 0) {
    console.log(`[ERC20] No whitelisted tokens for chain ${chainId}`);
    return positions;
  }

  const chainName = getChainName(chainId);
  const now = new Date().toISOString();

  for (const token of whitelist) {
    try {
      console.log(`[ERC20] Reading ${token.symbol} balance on ${chainName}...`);

      // Read balance
      const balance = await getTokenBalance(client, token.address, userAddress, ERC20_ABI);

      if (balance === BigInt(0)) {
        console.log(`[ERC20] ${token.symbol} balance is 0, skipping`);
        continue;
      }

      const amount = formatBalance(balance, token.decimals);
      console.log(`[ERC20] ${token.symbol} balance: ${amount}`);

      // Get APR data
      const apr = await getTokenApr(token.symbol);

      positions.push({
        symbol: token.symbol,
        asset: token.symbol,
        platform: 'ERC20 Holding',
        chain: `${chainId}`,
        amount,
        apr,
        source: 'ERC20 Token Balance',
        lastUpdated: now,
      });
    } catch (error) {
      console.error(`[ERC20] Error reading ${token.symbol} on chain ${chainId}:`, error);
      // Continue with next token
    }
  }

  console.log(`[ERC20] Found ${positions.length} ERC20 positions on chain ${chainId}`);
  return positions;
}

/**
 * Native currency info per chain
 */
interface NativeCurrencyInfo {
  symbol: string;
  name: string;
  decimals: number;
}

export const NATIVE_CURRENCIES: Record<number, NativeCurrencyInfo> = {
  1: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  11155111: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  137: { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
  80002: { symbol: 'MATIC', name: 'Polygon Amoy', decimals: 18 },
  42161: { symbol: 'ETH', name: 'Arbitrum', decimals: 18 },
  10: { symbol: 'ETH', name: 'Optimism', decimals: 18 },
  35935: { symbol: 'TRCT', name: 'TractSafe', decimals: 18 },
};

/**
 * Detect native currency balance for a wallet
 */
export async function getNativeCurrencyPosition(
  client: PublicClient,
  userAddress: `0x${string}`,
  chainId: number
): Promise<ERC20Position | null> {
  try {
    const nativeCurrency = NATIVE_CURRENCIES[chainId];
    if (!nativeCurrency) {
      console.log(`[Native] No native currency defined for chain ${chainId}`);
      return null;
    }

    console.log(`[Native] Reading ${nativeCurrency.symbol} balance on chain ${chainId}...`);

    // Read native balance
    const balanceRaw = await client.getBalance({ address: userAddress });
    const balance = formatBalance(balanceRaw, nativeCurrency.decimals);

    if (balance === 0) {
      console.log(`[Native] ${nativeCurrency.symbol} balance is 0`);
      return null;
    }

    console.log(`[Native] ${nativeCurrency.symbol} balance: ${balance}`);

    // Get APR data (most native currencies have 0 APR unless staking)
    const apr = await getTokenApr(nativeCurrency.symbol);

    const now = new Date().toISOString();
    const chainName = getChainName(chainId);

    return {
      symbol: nativeCurrency.symbol,
      asset: nativeCurrency.symbol,
      platform: 'Native Currency',
      chain: `${chainId}`,
      amount: balance,
      apr,
      source: 'Native Currency Balance',
      lastUpdated: now,
    };
  } catch (error) {
    console.error(`[Native] Error reading native currency balance on chain ${chainId}:`, error);
    return null;
  }
}

