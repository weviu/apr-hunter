import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { findPositionById } from '@/repositories/positionRepository';
import { getPositionSnapshots } from '@/services/PortfolioService';

type Ctx = { params: Promise<{ id: string; positionId: string }> };

export const GET = withAuth(async (request: NextRequest, session, context) => {
  const { positionId } = await (context as Ctx).params;

  // Verify ownership
  const position = await findPositionById(positionId);
  if (!position || position.userId !== session.user.id) {
    return err('Position not found', 'NOT_FOUND', 404);
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 365);

  const snapshots = await getPositionSnapshots(positionId, days);
  return ok(snapshots);
});
