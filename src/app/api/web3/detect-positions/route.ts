import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api/server-auth';
import { Position } from '@/types/portfolio';

interface DetectedPosition extends Omit<Position, '_id' | 'portfolioId' | 'userId' | 'createdAt' | 'updatedAt'> {
  _id?: never;
  portfolioId?: never;
  userId?: never;
  createdAt?: never;
  updatedAt?: never;
}

/**
 * POST /api/web3/detect-positions
 * Detect Web3 positions from a given wallet address
 * Currently supports: Lido stETH
 * Planned: Aave, Curve, Yearn
 */
export async function POST(req: Request) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as {
      walletAddress?: string;
      chainId?: number;
    };

    const { walletAddress, chainId = 1 } = body;

    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const positions: DetectedPosition[] = [];

    // TODO: Implement server-side Web3 detection
    // This would use a library like ethers.js or viem to read balances
    // For now, returning empty array - client-side detection via wagmi is preferred

    return NextResponse.json({
      success: true,
      data: {
        positions,
        walletAddress,
        chainId,
        lastScanned: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Web3] Position detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect positions' },
      { status: 500 }
    );
  }
}
