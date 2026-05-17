import { ok } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { getPositionStats } from '@/services/PortfolioService';

export const GET = withAuth(async (_request, session) => {
  const stats = await getPositionStats(session.user.id);
  return ok(stats);
});
