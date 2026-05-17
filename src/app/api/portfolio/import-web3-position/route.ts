import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { addPosition } from '@/services/PortfolioService';

export const POST = withAuth(async (request: NextRequest, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { portfolioId, walletAddress, chainId, protocol, asset, amount, aprAtEntry } =
    body as Record<string, unknown>;

  if (typeof portfolioId !== 'string' || !portfolioId) {
    return err('portfolioId is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof walletAddress !== 'string' || !walletAddress) {
    return err('walletAddress is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof asset !== 'string' || !asset.trim()) {
    return err('asset is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return err('amount must be a positive number', 'VALIDATION_ERROR', 422);
  }

  try {
    const position = await addPosition(session.user.id, {
      portfolioId,
      asset: asset.trim(),
      exchange: typeof protocol === 'string' ? protocol : 'web3',
      protocol: typeof protocol === 'string' ? protocol : null,
      chainId: typeof chainId === 'number' ? chainId : null,
      walletAddress,
      amount,
      aprAtEntry: typeof aprAtEntry === 'number' ? aprAtEntry : 0,
    });
    return ok(position, 201);
  } catch (e) {
    if ((e as Error).message === 'Portfolio not found') {
      return err('Portfolio not found', 'NOT_FOUND', 404);
    }
    console.error('[import-web3-position]', e);
    return err('Failed to import position', 'SERVER_ERROR', 500);
  }
});
