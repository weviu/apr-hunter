import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { listNotifications } from '@/services/NotificationService';

export const GET = withAuth(async (request: NextRequest, session) => {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const notifications = await listNotifications(session.user.id, unreadOnly);
  return ok(notifications);
});
