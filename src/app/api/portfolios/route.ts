import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getUserFromRequest } from '@/lib/api/server-auth';
import { createPortfolio, getUserPortfolios, getPortfolioById, updatePortfolio, deletePortfolio } from '@/lib/db/repositories/portfolioRepository';

export async function GET(req: Request) {
  try {
    const result = await getUserFromRequest(req);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = result;
    const portfolios = await getUserPortfolios(user._id);

    return NextResponse.json({
      success: true,
      data: { portfolios },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch portfolios' },
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
    const body = await req.json();

    const { name, description, type, walletAddress } = body;

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
      type,
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}
