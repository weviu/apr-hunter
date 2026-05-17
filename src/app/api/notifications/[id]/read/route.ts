import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { markRead } from '@/services/NotificationService';
import { findNotificationById } from '@/repositories/notificationRepository';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (_request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;
  const marked = await markRead(id, session.user.id);
  if (!marked) return err('Notification not found', 'NOT_FOUND', 404);

  const notification = await findNotificationById(id);
  return ok(notification);
});
