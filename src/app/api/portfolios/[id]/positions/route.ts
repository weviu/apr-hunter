import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api/server-auth';
import { Position } from '@/types/portfolio';
import {
  getPortfolioById,
  getPortfolioPositions,
  createPosition,
  getPositionById,
  recordPositionSnapshot,
} from '@/lib/db/repositories/portfolioRepository';
import { fetchAprBySymbol } from '@/lib/exchanges/registry';

async function enrichPositionWithApr(position: Position | Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const asset = typeof position.asset === 'string' ? position.asset : '';
    const platform = typeof position.platform === 'string' ? position.platform : '';
    const liveData = await fetchAprBySymbol(asset);
    const match = liveData.find(
      (item) => item.platform?.toLowerCase() === platform.toLowerCase()
    );
    if (match?.apr !== undefined) {
      return {
        ...position,
        currentApr: match.apr,
        aprSource: match.platform || position.platform,
        aprLastUpdated: match.lastUpdated || new Date().toISOString(),
      };
    }
  } catch {
    // fallback to stored APR
  }
  return position as Record<string, unknown>;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getUserFromRequest(req);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;
    const { id } = await params;

    const portfolio = await getPortfolioById(id);
    if (!portfolio) {
      return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
    }

    if (portfolio.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const positions = await getPortfolioPositions(id);
    const enriched = await Promise.all(positions.map((p) => enrichPositionWithApr(p)));

    return NextResponse.json({
      success: true,
      data: { positions: enriched },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch positions';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getUserFromRequest(req);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;
    const { id } = await params;
    const body = await req.json();

    const portfolio = await getPortfolioById(id);
    if (!portfolio) {
      return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
    }

    if (portfolio.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { symbol, asset, platform, platformType, chain, amount, apr, riskLevel, source } = body as Record<string, unknown>;

    if (!symbol || !asset || !platform || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'symbol, asset, platform, and amount are required' },
        { status: 400 }
      );
    }

    const positionData: Omit<Position, '_id' | 'portfolioId' | 'userId' | 'createdAt' | 'updatedAt'> = {
      symbol: String(symbol).toUpperCase(),
      asset: String(asset).toUpperCase(),
      platform: String(platform),
      amount: Number(amount),
      isActive: true,
    };
    
    if (platformType) positionData.platformType = String(platformType);
    if (chain) positionData.chain = String(chain);
    if (apr !== undefined) positionData.apr = Number(apr);
    if (riskLevel) positionData.riskLevel = String(riskLevel);
    if (source) positionData.source = String(source);

    const positionId = await createPosition(id, user._id, positionData);

    const position = await getPositionById(positionId);
    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Failed to create position' },
        { status: 500 }
      );
    }
    const enriched = await enrichPositionWithApr(position);

    // Record initial snapshot
    await recordPositionSnapshot(positionId, id, user._id, {
      symbol: String(symbol).toUpperCase(),
      amount: Number(amount),
      apr: apr !== undefined ? Number(apr) : undefined,
      capturedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        data: { position: enriched },
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create position';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
