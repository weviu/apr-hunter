import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { findExchangeKeysByUserId } from '@/repositories/exchangeKeyRepository';

export const GET = withAuth(async (_request: NextRequest, session) => {
  const keys = await findExchangeKeysByUserId(session.user.id);
  const exchanges = keys.map((k) => k.exchange);
  return ok(exchanges);
});
