import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getUserFromRequest } from '@/lib/api/server-auth';
import {
  getPortfolioById,
  getPortfolioPositions,
  createPosition,
  getPositionById,
  updatePosition,
  deletePosition,
  recordPositionSnapshot,
} from '@/lib/db/repositories/portfolioRepository';
import { fetchAprBySymbol } from '@/lib/exchanges/registry';

async function enrichPositionWithApr(position: any) {
  try {
    const liveData = await fetchAprBySymbol(position.asset);
    const match = liveData.find(
      (item) => item.platform?.toLowerCase() === position.platform?.toLowerCase()
    );
    if (match?.apr !== undefined) {
      return {
        ...position,
        currentApr: match.apr,
        aprSource: match.platform || position.platform,
        aprLastUpdated: match.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (e) {
    // fallback to stored APR
  }
  return position;
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch positions' },
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

    const { symbol, asset, platform, platformType, chain, amount, apr, riskLevel, source } = body;

    if (!symbol || !asset || !platform || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'symbol, asset, platform, and amount are required' },
        { status: 400 }
      );
    }

    const positionId = await createPosition(id, user._id, {
      symbol: symbol.toUpperCase(),
      asset: asset.toUpperCase(),
      platform,
      platformType,
      chain,
      amount: Number(amount),
      apr: apr !== undefined ? Number(apr) : undefined,
      riskLevel,
      source,
      isActive: true,
    });

    const position = await getPositionById(positionId);
    const enriched = await enrichPositionWithApr(position);

    // Record initial snapshot
    await recordPositionSnapshot(positionId, id, user._id, {
      symbol: symbol.toUpperCase(),
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create position' },
      { status: 500 }
    );
  }
}
