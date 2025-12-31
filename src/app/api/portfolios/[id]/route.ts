import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api/server-auth';
import {
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  getPortfolioPositions,
  getPortfolioStats,
} from '@/lib/db/repositories/portfolioRepository';

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

    // Verify ownership
    if (portfolio.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const positions = await getPortfolioPositions(id);
    const stats = await getPortfolioStats(id);

    return NextResponse.json({
      success: true,
      data: { portfolio, positions, stats },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch portfolio';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Verify ownership
    if (portfolio.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, isActive } = body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    await updatePortfolio(id, updates);
    const updated = await getPortfolioById(id);

    return NextResponse.json({
      success: true,
      data: { portfolio: updated },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update portfolio';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Verify ownership
    if (portfolio.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await deletePortfolio(id);

    return NextResponse.json({
      success: true,
      message: 'Portfolio deleted',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete portfolio';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
