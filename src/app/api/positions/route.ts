import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { createManualPosition, getEnrichedUserPositions } from '@/services/PortfolioService';

/** All open positions for the user, each joined to its current live APR. */
export const GET = withAuth(async (_request: NextRequest, session) => {
  const positions = await getEnrichedUserPositions(session.user.id);
  return ok(positions);
});

/**
 * Create a manual position in the user's default portfolio.
 * Body: { asset, exchange, product?, amount }
 */
export const POST = withAuth(async (request: NextRequest, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { asset, exchange, product, amount } = body as Record<string, unknown>;

  if (typeof asset !== 'string' || !asset.trim()) {
    return err('asset is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof exchange !== 'string' || !exchange.trim()) {
    return err('exchange is required', 'VALIDATION_ERROR', 422);
  }
  const amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return err('amount must be a positive number', 'VALIDATION_ERROR', 422);
  }

  const position = await createManualPosition(session.user.id, {
    asset: asset.trim(),
    exchange: exchange.trim(),
    product: typeof product === 'string' && product.trim() ? product.trim() : null,
    amount: amountNum,
  });

  return ok(position, 201);
});
