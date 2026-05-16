import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';

const COL = 'alerts';

export interface AlertDocument {
  _id: ObjectId;
  userId: ObjectId;
  asset: string;
  exchange: string | null;    // null = any exchange
  condition: 'above' | 'below';
  threshold: number;          // APR decimal
  active: boolean;
  lastFiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertData {
  id: string;
  userId: string;
  asset: string;
  exchange: string | null;
  condition: 'above' | 'below';
  threshold: number;
  active: boolean;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

function toAlert(doc: AlertDocument): AlertData {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    asset: doc.asset,
    exchange: doc.exchange,
    condition: doc.condition,
    threshold: doc.threshold,
    active: doc.active,
    lastFiredAt: doc.lastFiredAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createAlert(
  userId: string | ObjectId,
  data: {
    asset: string;
    exchange?: string | null;
    condition: 'above' | 'below';
    threshold: number;
  },
): Promise<string> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');
  const now = new Date();
  const result = await db.collection(COL).insertOne({
    userId: toId(userId),
    asset: data.asset.toUpperCase(),
    exchange: data.exchange ?? null,
    condition: data.condition,
    threshold: data.threshold,
    active: true,
    lastFiredAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId.toHexString();
}

export async function findAlertsByUserId(
  userId: string | ObjectId,
  activeOnly = false,
): Promise<AlertData[]> {
  const db = await getMongoDb();
  if (!db) return [];
  const filter: Record<string, unknown> = { userId: toId(userId) };
  if (activeOnly) filter.active = true;
  const docs = await db
    .collection<AlertDocument>(COL)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toAlert);
}

export async function findAlertById(id: string | ObjectId): Promise<AlertData | null> {
  const db = await getMongoDb();
  if (!db) return null;
  const doc = await db.collection<AlertDocument>(COL).findOne({ _id: toId(id) });
  return doc ? toAlert(doc) : null;
}

export async function updateAlert(
  id: string | ObjectId,
  data: Partial<Pick<AlertDocument, 'condition' | 'threshold' | 'exchange' | 'active'>>,
): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(COL).updateOne(
    { _id: toId(id) },
    { $set: { ...data, updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

export async function deleteAlert(id: string | ObjectId): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(COL).deleteOne({ _id: toId(id) });
  return result.deletedCount > 0;
}

/**
 * Returns all active alerts that target a specific asset (or any exchange).
 * Used by the sync job to evaluate whether notifications should fire.
 */
export async function findActiveAlertsByAsset(asset: string): Promise<AlertData[]> {
  const db = await getMongoDb();
  if (!db) return [];
  const docs = await db
    .collection<AlertDocument>(COL)
    .find({ asset: asset.toUpperCase(), active: true })
    .toArray();
  return docs.map(toAlert);
}

/** Mark an alert as fired (updates lastFiredAt). */
export async function markAlertFired(id: string | ObjectId): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;
  await db.collection(COL).updateOne(
    { _id: toId(id) },
    { $set: { lastFiredAt: new Date(), updatedAt: new Date() } },
  );
}
