import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api/server-auth';
import { createPortfolio, getUserPortfolios, getPortfolioById, getPortfolioStats } from '@/lib/db/repositories/portfolioRepository';

export async function GET(req: Request) {
  try {
    const result = await getUserFromRequest(req);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;
    const portfolios = await getUserPortfolios(user._id);

    // Enrich portfolios with stats
    const portfoliosWithStats = await Promise.all(
      portfolios.map(async (portfolio) => {
        const stats = await getPortfolioStats(portfolio._id!);
        return {
          ...portfolio,
          totalValue: stats?.totalValue ?? 0,
          totalPositions: stats?.totalPositions ?? 0,
          avgApr: stats?.avgApr ?? 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { portfolios: portfoliosWithStats },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch portfolios';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const result = await getUserFromRequest(req);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;
    const body = await req.json() as Record<string, unknown>;

    const { name, description, type, walletAddress } = body as { name?: string; description?: string; type?: string; walletAddress?: string };

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (!['web2', 'web3'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "web2" or "web3"' },
        { status: 400 }
      );
    }

    const portfolioId = await createPortfolio(user._id, {
      name,
      description,
      type: type as 'web2' | 'web3',
      walletAddress: type === 'web3' ? walletAddress : undefined,
      isActive: true,
    });

    const portfolio = await getPortfolioById(portfolioId);

    return NextResponse.json(
      {
        success: true,
        data: { portfolio },
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create portfolio';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
