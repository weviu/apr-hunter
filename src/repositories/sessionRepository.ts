import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';

const COL = 'sessions';

export interface SessionDocument {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string;
}

function toId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

export async function createSession(data: {
  userId: string | ObjectId;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
}): Promise<string> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');
  const doc: Omit<SessionDocument, '_id'> = {
    userId: toId(data.userId),
    tokenHash: data.tokenHash,
    createdAt: new Date(),
    expiresAt: data.expiresAt,
    ...(data.userAgent ? { userAgent: data.userAgent } : {}),
  };
  const result = await db.collection(COL).insertOne(doc);
  return result.insertedId.toHexString();
}

/** Returns the session only if it exists and has not expired. */
export async function findSessionByTokenHash(
  tokenHash: string,
): Promise<SessionDocument | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db
    .collection<SessionDocument>(COL)
    .findOne({ tokenHash, expiresAt: { $gt: new Date() } });
}

export async function extendSession(
  id: string | ObjectId,
  newExpiry: Date,
): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db
    .collection(COL)
    .updateOne({ _id: toId(id) }, { $set: { expiresAt: newExpiry } });
  return result.modifiedCount > 0;
}

export async function deleteSession(id: string | ObjectId): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(COL).deleteOne({ _id: toId(id) });
  return result.deletedCount > 0;
}

/** Delete all sessions for a user (e.g. on password change or full logout). */
export async function deleteAllUserSessions(userId: string | ObjectId): Promise<number> {
  const db = await getMongoDb();
  if (!db) return 0;
  const result = await db.collection(COL).deleteMany({ userId: toId(userId) });
  return result.deletedCount;
}

/** Prune TTL-expired sessions (MongoDB TTL index handles this automatically; this is a manual fallback). */
export async function deleteExpiredSessions(): Promise<number> {
  const db = await getMongoDb();
  if (!db) return 0;
  const result = await db
    .collection(COL)
    .deleteMany({ expiresAt: { $lte: new Date() } });
  return result.deletedCount;
}
