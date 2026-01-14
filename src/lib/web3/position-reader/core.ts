/**
 * Core Web3 utilities for reading contract data using viem
 */

import { createPublicClient, http, PublicClient, defineChain } from 'viem';
import { mainnet, polygon, arbitrum, optimism, sepolia } from 'viem/chains';
import type { Chain } from 'viem';

// TractSafe Testnet definition
const tractsafe = defineChain({
  id: 35935,
  name: 'TractSafe',
  nativeCurrency: { name: 'TractSafe', symbol: 'TRACT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://tapi.tractsafe.com/'] },
    public: { http: ['https://tapi.tractsafe.com/'] },
  },
  blockExplorers: {
    default: { name: 'TractSafe Explorer', url: 'https://explorer.tractsafe.com' },
  },
  testnet: true,
});

const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  35935: tractsafe,
};

export function getViemChain(chainId: number): Chain {
  return CHAIN_MAP[chainId] || mainnet;
}

export function createWeb3Reader(chainId: number, rpcUrl?: string): PublicClient {
  const chain = getViemChain(chainId);
  
  // Use provided RPC URL or fallback to viem's default
  const transport = rpcUrl ? http(rpcUrl, { timeout: 30000 }) : http(); // 30 second RPC timeout

  return createPublicClient({
    chain,
    transport,
  });
}

/**
 * Read ERC20 token balance
 */
export async function getTokenBalance(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  userAddress: `0x${string}`,
  abi: readonly unknown[] = []
): Promise<bigint> {
  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: abi.length > 0 ? abi : [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [userAddress],
    }) as bigint;
    return balance;
  } catch (error) {
    console.error(
      `Error reading balance for ${tokenAddress} on chain ${client.chain?.id}:`,
      error
    );
    return BigInt(0);
  }
}

/**
 * Read ERC20 decimals
 */
export async function getTokenDecimals(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  abi: readonly unknown[] = []
): Promise<number> {
  try {
    const decimals = await client.readContract({
      address: tokenAddress,
      abi: abi.length > 0 ? abi : [
        {
          name: 'decimals',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }],
        },
      ],
      functionName: 'decimals',
      args: [],
    }) as number;
    return decimals;
  } catch (error) {
    console.error(
      `Error reading decimals for ${tokenAddress} on chain ${client.chain?.id}:`,
      error
    );
    return 18; // Default to 18 decimals
  }
}

/**
 * Format BigInt to decimal number
 */
export function formatBalance(balance: bigint, decimals: number): number {
  return Number(balance) / Math.pow(10, decimals);
}

/**
 * Batch read multiple contract calls
 */
export async function batchReadContracts(
  client: PublicClient,
  calls: Array<{
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }>
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (client as any).multicall({
      contracts: calls,
      allowFailure: true,
    });
    return results;
  } catch (error) {
    console.error('Error in batch read:', error);
    return calls.map(() => null);
  }
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
