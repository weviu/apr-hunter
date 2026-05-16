import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';

const COL = 'notifications';

export type NotificationType = 'alert_triggered' | 'sync_complete' | 'info';

export interface NotificationDocument {
  _id: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedAlertId: ObjectId | null;
  createdAt: Date;
}

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedAlertId: string | null;
  createdAt: string;
}

function toId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

function toNotification(doc: NotificationDocument): NotificationData {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    read: doc.read,
    relatedAlertId: doc.relatedAlertId?.toHexString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function createNotification(
  userId: string | ObjectId,
  data: {
    type: NotificationType;
    title: string;
    message: string;
    relatedAlertId?: string | ObjectId | null;
  },
): Promise<string> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');
  const result = await db.collection(COL).insertOne({
    userId: toId(userId),
    type: data.type,
    title: data.title,
    message: data.message,
    read: false,
    relatedAlertId: data.relatedAlertId ? toId(data.relatedAlertId) : null,
    createdAt: new Date(),
  });
  return result.insertedId.toHexString();
}

export async function findNotificationsByUserId(
  userId: string | ObjectId,
  unreadOnly = false,
): Promise<NotificationData[]> {
  const db = await getMongoDb();
  if (!db) return [];
  const filter: Record<string, unknown> = { userId: toId(userId) };
  if (unreadOnly) filter.read = false;
  const docs = await db
    .collection<NotificationDocument>(COL)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return docs.map(toNotification);
}

export async function findNotificationById(
  id: string | ObjectId,
): Promise<NotificationData | null> {
  const db = await getMongoDb();
  if (!db) return null;
  const doc = await db.collection<NotificationDocument>(COL).findOne({ _id: toId(id) });
  return doc ? toNotification(doc) : null;
}

export async function markNotificationRead(id: string | ObjectId): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db
    .collection(COL)
    .updateOne({ _id: toId(id) }, { $set: { read: true } });
  return result.modifiedCount > 0;
}

export async function markAllNotificationsRead(userId: string | ObjectId): Promise<number> {
  const db = await getMongoDb();
  if (!db) return 0;
  const result = await db
    .collection(COL)
    .updateMany({ userId: toId(userId), read: false }, { $set: { read: true } });
  return result.modifiedCount;
}

export async function deleteNotification(id: string | ObjectId): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(COL).deleteOne({ _id: toId(id) });
  return result.deletedCount > 0;
}

/** Delete all read notifications for a user (housekeeping). */
export async function clearReadNotifications(userId: string | ObjectId): Promise<number> {
  const db = await getMongoDb();
  if (!db) return 0;
  const result = await db
    .collection(COL)
    .deleteMany({ userId: toId(userId), read: true });
  return result.deletedCount;
}
