import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { clearRead } from '@/services/NotificationService';

export const DELETE = withAuth(async (_request: NextRequest, session) => {
  const count = await clearRead(session.user.id);
  return ok({ count });
});
