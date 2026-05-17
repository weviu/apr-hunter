import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { findPositionById } from '@/repositories/positionRepository';
import { updateUserPosition, closeUserPosition, getPositionSnapshots } from '@/services/PortfolioService';

type Ctx = { params: Promise<{ id: string; positionId: string }> };

export const GET = withAuth(async (_request: NextRequest, session, context) => {
  const { positionId } = await (context as Ctx).params;
  const position = await findPositionById(positionId);
  if (!position || position.userId !== session.user.id) {
    return err('Position not found', 'NOT_FOUND', 404);
  }
  return ok(position);
});

export const PATCH = withAuth(async (request: NextRequest, session, context) => {
  const { positionId } = await (context as Ctx).params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { amount, notes } = body as Record<string, unknown>;
  const update: Partial<{ amount: number; notes: string | null }> = {};
  if (typeof amount === 'number' && amount > 0) update.amount = amount;
  if (notes !== undefined) update.notes = typeof notes === 'string' ? notes : null;

  const updated = await updateUserPosition(positionId, session.user.id, update);
  if (!updated) return err('Position not found', 'NOT_FOUND', 404);

  const position = await findPositionById(positionId);
  return ok(position);
});

export const DELETE = withAuth(async (_request: NextRequest, session, context) => {
  const { positionId } = await (context as Ctx).params;
  const closed = await closeUserPosition(positionId, session.user.id);
  if (!closed) return err('Position not found', 'NOT_FOUND', 404);
  return ok({ id: positionId });
});
