import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { getUserPortfolios, createUserPortfolio } from '@/services/PortfolioService';

export const GET = withAuth(async (_request, session) => {
  const portfolios = await getUserPortfolios(session.user.id);
  return ok(portfolios);
});

export const POST = withAuth(async (request: NextRequest, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { name, description } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    return err('name is required', 'VALIDATION_ERROR', 422);
  }

  try {
    const portfolio = await createUserPortfolio(session.user.id, {
      name: name.trim(),
      description: typeof description === 'string' ? description : undefined,
    });
    return ok(portfolio, 201);
  } catch (e) {
    console.error('[POST /api/portfolios]', e);
    return err('Failed to create portfolio', 'SERVER_ERROR', 500);
  }
});
