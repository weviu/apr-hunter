import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { markAllRead } from '@/services/NotificationService';

export const POST = withAuth(async (_request: NextRequest, session) => {
  await markAllRead(session.user.id);
  return ok({ ok: true });
});
