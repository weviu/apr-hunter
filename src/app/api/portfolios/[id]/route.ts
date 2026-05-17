import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import {
  getPortfolio,
  updateUserPortfolio,
  deleteUserPortfolio,
} from '@/services/PortfolioService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;
  const portfolio = await getPortfolio(id, session.user.id);
  if (!portfolio) return err('Portfolio not found', 'NOT_FOUND', 404);
  return ok(portfolio);
});

export const PATCH = withAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { name, description } = body as Record<string, unknown>;
  const update: Partial<{ name: string; description: string | null }> = {};
  if (typeof name === 'string') update.name = name.trim();
  if (description !== undefined) {
    update.description = typeof description === 'string' ? description : null;
  }

  const updated = await updateUserPortfolio(id, session.user.id, update);
  if (!updated) return err('Portfolio not found', 'NOT_FOUND', 404);

  const portfolio = await getPortfolio(id, session.user.id);
  return ok(portfolio);
});

export const DELETE = withAuth(async (_request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;
  const deleted = await deleteUserPortfolio(id, session.user.id);
  if (!deleted) return err('Portfolio not found', 'NOT_FOUND', 404);
  return ok({ id });
});
