import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { getPortfolioPositions, addPosition } from '@/services/PortfolioService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;
  const positions = await getPortfolioPositions(id, session.user.id);
  return ok(positions);
});

export const POST = withAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { asset, exchange, amount, aprAtEntry, stakedAt, protocol, chainId, walletAddress, notes } =
    body as Record<string, unknown>;

  if (typeof asset !== 'string' || !asset.trim()) {
    return err('asset is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof exchange !== 'string' || !exchange.trim()) {
    return err('exchange is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return err('amount must be a positive number', 'VALIDATION_ERROR', 422);
  }
  if (typeof aprAtEntry !== 'number' || aprAtEntry < 0) {
    return err('aprAtEntry must be a non-negative number', 'VALIDATION_ERROR', 422);
  }

  try {
    const position = await addPosition(session.user.id, {
      portfolioId: id,
      asset: asset.trim(),
      exchange: exchange.trim(),
      amount,
      aprAtEntry,
      stakedAt: stakedAt ? new Date(stakedAt as string) : undefined,
      protocol: typeof protocol === 'string' ? protocol : null,
      chainId: typeof chainId === 'number' ? chainId : null,
      walletAddress: typeof walletAddress === 'string' ? walletAddress : null,
      notes: typeof notes === 'string' ? notes : null,
    });
    return ok(position, 201);
  } catch (e) {
    if ((e as Error).message === 'Portfolio not found') {
      return err('Portfolio not found', 'NOT_FOUND', 404);
    }
    console.error('[POST /api/portfolios/[id]/positions]', e);
    return err('Failed to add position', 'SERVER_ERROR', 500);
  }
});
