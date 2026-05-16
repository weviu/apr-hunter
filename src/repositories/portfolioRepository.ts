import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { Portfolio } from '@/types/portfolio';

const COL = 'portfolios';

interface PortfolioDoc {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

function toId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

function toPortfolio(doc: PortfolioDoc): Portfolio {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    name: doc.name,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    deletedAt: doc.deletedAt?.toISOString() ?? null,
  };
}

export async function createPortfolio(
  userId: string | ObjectId,
  data: { name: string; description?: string },
): Promise<string> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');
  const now = new Date();
  const result = await db.collection(COL).insertOne({
    userId: toId(userId),
    name: data.name,
    description: data.description ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return result.insertedId.toHexString();
}

/** Returns only active (non-deleted) portfolios. */
export async function findPortfoliosByUserId(userId: string | ObjectId): Promise<Portfolio[]> {
  const db = await getMongoDb();
  if (!db) return [];
  const docs = await db
    .collection<PortfolioDoc>(COL)
    .find({ userId: toId(userId), deletedAt: null })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toPortfolio);
}

export async function findPortfolioById(id: string | ObjectId): Promise<Portfolio | null> {
  const db = await getMongoDb();
  if (!db) return null;
  const doc = await db.collection<PortfolioDoc>(COL).findOne({ _id: toId(id) });
  return doc ? toPortfolio(doc) : null;
}

export async function updatePortfolio(
  id: string | ObjectId,
  data: Partial<{ name: string; description: string | null }>,
): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(COL).updateOne(
    { _id: toId(id), deletedAt: null },
    { $set: { ...data, updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

/** Soft-delete: sets deletedAt. Records are never hard-deleted. */
export async function softDeletePortfolio(id: string | ObjectId): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(COL).updateOne(
    { _id: toId(id), deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}
