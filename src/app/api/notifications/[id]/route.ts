import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { deleteUserNotification } from '@/services/NotificationService';
import { findNotificationById } from '@/repositories/notificationRepository';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;
  const notification = await findNotificationById(id);
  if (!notification || notification.userId !== session.user.id) {
    return err('Notification not found', 'NOT_FOUND', 404);
  }
  return ok(notification);
});

export const DELETE = withAuth(async (_request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;
  const deleted = await deleteUserNotification(id, session.user.id);
  if (!deleted) return err('Notification not found', 'NOT_FOUND', 404);
  return ok({ id });
});
