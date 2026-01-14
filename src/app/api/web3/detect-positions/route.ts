import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api/server-auth';
import { Position } from '@/types/portfolio';
import {
  createWeb3Reader,
  isValidAddress,
  getLidoPosition,
  getAaveSuppliedPositions,
  getYearnPositions,
} from '@/lib/web3/position-reader';

interface DetectedPosition extends Omit<Position, '_id' | 'portfolioId' | 'userId' | 'createdAt' | 'updatedAt'> {
  _id?: never;
  portfolioId?: never;
  userId?: never;
  createdAt?: never;
  updatedAt?: never;
  detectionType?: 'lido' | 'aave' | 'yearn';
}

// Chain-specific public RPC URLs
const CHAIN_RPC_URLS: Record<number, string> = {
  1: 'https://eth.llamarpc.com', // Ethereum Mainnet
  11155111: 'https://ethereum-sepolia.blockpi.network/v1/rpc/public', // Sepolia Testnet
  137: 'https://polygon.llamarpc.com', // Polygon
  42161: 'https://arbitrum.llamarpc.com', // Arbitrum
  10: 'https://optimism.llamarpc.com', // Optimism
  35935: 'https://tapi.tractsafe.com/', // TractSafe
};

/**
 * POST /api/web3/detect-positions
 * Detect Web3 positions from a given wallet address
 * Supports: Lido stETH, Aave V3, Yearn Vaults
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  console.log('[Web3] Position detection starting...');
  
  try {
    // Optional auth - endpoint works without login but can track user if logged in
    const auth = await getUserFromRequest(req);
    if (auth) {
      console.log('[Web3] Request authenticated');
    } else {
      console.log('[Web3] Request unauthenticated (public endpoint)');
    }

    console.log('[Web3] Parsing request body...');
    const body = (await req.json()) as {
      walletAddress?: string;
      chainIds?: number[];
    };

    const { walletAddress, chainIds = [1] } = body; // Default to Ethereum mainnet
    console.log(`[Web3] Wallet: ${walletAddress}, Chains: ${chainIds}`);

    if (!walletAddress || !isValidAddress(walletAddress)) {
      console.log('[Web3] Invalid wallet address format');
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const positions: DetectedPosition[] = [];

    // Create readers for requested chains
    for (const chainId of chainIds) {
      console.log(`[Web3] Processing chain ${chainId}...`);
      const chainStartTime = Date.now();
      try {
        const rpcUrl = CHAIN_RPC_URLS[chainId];
        if (!rpcUrl) {
          console.warn(`[Web3] No RPC URL configured for chain ${chainId}, skipping...`);
          continue;
        }
        console.log(`[Web3] Creating reader for chain ${chainId} with RPC: ${rpcUrl}`);
        const client = createWeb3Reader(chainId, rpcUrl);
        console.log(`[Web3] Reader created for chain ${chainId}`);

        // Detect Lido stETH
        try {
          const lidoStartTime = Date.now();
          console.log(`[Web3] Detecting Lido positions on chain ${chainId}...`);
          const lidoPos = await Promise.race([
            getLidoPosition(client, walletAddress, chainId),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error(`Lido detection timeout on chain ${chainId}`)), 10000)
            ),
          ]);
          const lidoDuration = Date.now() - lidoStartTime;
          console.log(`[Web3] Lido detection complete for chain ${chainId} (${lidoDuration}ms): ${lidoPos ? 'found' : 'not found'}`);
          if (lidoPos) {
            positions.push({
              symbol: lidoPos.symbol,
              asset: lidoPos.asset,
              platform: lidoPos.platform,
              chain: lidoPos.chain,
              amount: lidoPos.amount,
              apr: lidoPos.apr,
              source: lidoPos.source,
              isActive: true,
              detectionType: 'lido',
            } as DetectedPosition);
          }
        } catch (error) {
          console.error(`[Web3] Error detecting Lido positions on chain ${chainId}:`, error);
        }

        // Detect Aave supplied positions
        try {
          const aaveStartTime = Date.now();
          console.log(`[Web3] Detecting Aave positions on chain ${chainId}...`);
          const aavePositions = await Promise.race([
            getAaveSuppliedPositions(client, walletAddress, chainId),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error(`Aave detection timeout on chain ${chainId}`)), 10000)
            ),
          ]);
          const aaveDuration = Date.now() - aaveStartTime;
          console.log(`[Web3] Aave detection complete for chain ${chainId} (${aaveDuration}ms): found ${aavePositions.length}`);
          for (const aavePos of aavePositions) {
            positions.push({
              symbol: aavePos.symbol,
              asset: aavePos.asset,
              platform: aavePos.platform,
              chain: aavePos.chain,
              amount: aavePos.amount,
              apr: aavePos.apr,
              source: aavePos.source,
              isActive: true,
              detectionType: 'aave',
            } as DetectedPosition);
          }
        } catch (error) {
          console.error(`[Web3] Error detecting Aave positions on chain ${chainId}:`, error);
        }

        // Detect Yearn vault positions
        try {
          const yearnStartTime = Date.now();
          console.log(`[Web3] Detecting Yearn positions on chain ${chainId}...`);
          const yearnPositions = await Promise.race([
            getYearnPositions(client, walletAddress, chainId),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error(`Yearn detection timeout on chain ${chainId}`)), 10000)
            ),
          ]);
          const yearnDuration = Date.now() - yearnStartTime;
          console.log(`[Web3] Yearn detection complete for chain ${chainId} (${yearnDuration}ms): found ${yearnPositions.length}`);
          for (const yearnPos of yearnPositions) {
            positions.push({
              symbol: yearnPos.symbol,
              asset: yearnPos.asset,
              platform: yearnPos.platform,
              chain: yearnPos.chain,
              amount: yearnPos.amount,
              apr: yearnPos.apr,
              source: yearnPos.source,
              isActive: true,
              detectionType: 'yearn',
            } as DetectedPosition);
          }
        } catch (error) {
          console.error(`[Web3] Error detecting Yearn positions on chain ${chainId}:`, error);
        }
        
        const chainDuration = Date.now() - chainStartTime;
        console.log(`[Web3] Chain ${chainId} processing complete (${chainDuration}ms)`);
      } catch (chainError) {
        console.error(`[Web3] Error reading chain ${chainId}:`, chainError);
        // Continue with next chain
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Web3] Position detection complete. Found ${positions.length} positions in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      data: {
        positions,
        walletAddress,
        chainIds,
        detectedCount: positions.length,
        lastScanned: new Date().toISOString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Web3] Position detection error (after ${duration}ms):`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect positions' },
      { status: 500 }
    );
  }
}
