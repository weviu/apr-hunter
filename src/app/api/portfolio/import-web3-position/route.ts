import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api/server-auth';
import { DetectedWeb3Position } from '@/types/web3';

interface ImportWeb3PositionRequest {
  position: DetectedWeb3Position;
  portfolioId: string;
}

/**
 * POST /api/portfolio/import-web3-position
 * Import a detected Web3 position into a portfolio
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ImportWeb3PositionRequest = await req.json();
    const { position, portfolioId } = body;

    if (!position || !portfolioId) {
      return NextResponse.json(
        { error: 'Missing position or portfolioId' },
        { status: 400 }
      );
    }

    // TODO: Implement actual import logic
    // 1. Verify portfolio belongs to user
    // 2. Create position entry in database with Web3 metadata
    // 3. Store detection metadata (chain, protocol, APR, etc.)
    // 4. Return created position

    // For now, return success with placeholder
    return NextResponse.json(
      {
        success: true,
        message: 'Position import pending',
        position: {
          symbol: position.symbol,
          amount: position.amount,
          apr: position.apr,
          chain: position.chain,
          platform: position.platform,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error importing Web3 position:', error);
    return NextResponse.json(
      { error: 'Failed to import position' },
      { status: 500 }
    );
  }
}
