import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { getUserPositions } from '@/services/PortfolioService';

export const GET = withAuth(async (_request: NextRequest, session) => {
  const positions = await getUserPositions(session.user.id);
  return ok(positions);
});
