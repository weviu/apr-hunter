import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api/server-auth';
import { Position } from '@/types/portfolio';
import {
  getPortfolioById,
  getPositionById,
  updatePosition,
  deletePosition,
  getPositionHistory,
} from '@/lib/db/repositories/portfolioRepository';
import { fetchAprBySymbol } from '@/lib/exchanges/registry';

async function enrichPositionWithApr(position: Position | Record<string, unknown> | null): Promise<Record<string, unknown>> {
  if (!position) return {};
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
    // fallback
  }
  return position as Record<string, unknown>;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; positionId: string }> }
) {
  try {
    const result = await getUserFromRequest(req);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;
    const { id, positionId } = await params;

    const portfolio = await getPortfolioById(id);
    if (!portfolio) {
      return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
    }

    if (portfolio.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const position = await getPositionById(positionId);
    if (!position || position.portfolioId.toString() !== id) {
      return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
    }

    const enriched = await enrichPositionWithApr(position || null);
    const history = await getPositionHistory(positionId);

    return NextResponse.json({
      success: true,
      data: { position: enriched, history },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch position';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; positionId: string }> }
) {
  try {
    const result = await getUserFromRequest(req);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;
    const { id, positionId } = await params;
    const body = await req.json();

    const portfolio = await getPortfolioById(id);
    if (!portfolio) {
      return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
    }

    if (portfolio.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const position = await getPositionById(positionId);
    if (!position || position.portfolioId.toString() !== id) {
      return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
    }

    const { amount, apr, riskLevel } = body;
    const updates: Record<string, unknown> = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (apr !== undefined) updates.apr = Number(apr);
    if (riskLevel !== undefined) updates.riskLevel = riskLevel;

    await updatePosition(positionId, updates);
    const updated = await getPositionById(positionId);
    const enriched = await enrichPositionWithApr(updated);

    return NextResponse.json({
      success: true,
      data: { position: enriched },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update position';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; positionId: string }> }
) {
  try {
    const result = await getUserFromRequest(req);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;
    const { id, positionId } = await params;

    const portfolio = await getPortfolioById(id);
    if (!portfolio) {
      return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
    }

    if (portfolio.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const position = await getPositionById(positionId);
    if (!position || position.portfolioId.toString() !== id) {
      return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
    }

    await deletePosition(positionId);

    return NextResponse.json({
      success: true,
      message: 'Position deleted',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete position';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
