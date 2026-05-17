import {
  findNotificationsByUserId,
  findNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
} from '@/repositories/notificationRepository';
import type { NotificationData } from '@/repositories/notificationRepository';

// ─── Public API ───────────────────────────────────────────────────────────────

export async function listNotifications(
  userId: string,
  unreadOnly?: boolean,
): Promise<NotificationData[]> {
  return findNotificationsByUserId(userId, unreadOnly);
}

export async function markRead(notificationId: string, userId: string): Promise<boolean> {
  const notification = await findNotificationById(notificationId);
  if (!notification || notification.userId !== userId) return false;
  return markNotificationRead(notificationId);
}

export async function markAllRead(userId: string): Promise<void> {
  await markAllNotificationsRead(userId);
}

export async function deleteUserNotification(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const notification = await findNotificationById(notificationId);
  if (!notification || notification.userId !== userId) return false;
  return deleteNotification(notificationId);
}

export async function clearRead(userId: string): Promise<number> {
  return clearReadNotifications(userId);
}
