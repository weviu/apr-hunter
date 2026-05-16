import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { Position } from '@/types/portfolio';

const POSITIONS = 'positions';
const HISTORY = 'position_history';

interface PositionDoc {
  _id: ObjectId;
  portfolioId: ObjectId;
  userId: ObjectId;
  asset: string;
  exchange: string;
  protocol: string | null;
  chainId: number | null;
  walletAddress: string | null;
  amount: number;
  aprAtEntry: number;
  stakedAt: Date;
  closedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PositionHistoryDoc {
  _id: ObjectId;
  positionId: ObjectId;
  apr: number;
  value: number | null;
  recordedAt: Date;
}

export interface PositionStats {
  totalPositions: number;
  openPositions: number;
  totalValue: number;
  weightedApr: number;
}

function toId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

function toPosition(doc: PositionDoc): Position {
  return {
    id: doc._id.toHexString(),
    portfolioId: doc.portfolioId.toHexString(),
    userId: doc.userId.toHexString(),
    asset: doc.asset,
    exchange: doc.exchange,
    protocol: doc.protocol,
    chainId: doc.chainId,
    walletAddress: doc.walletAddress,
    amount: doc.amount,
    aprAtEntry: doc.aprAtEntry,
    stakedAt: doc.stakedAt.toISOString(),
    closedAt: doc.closedAt?.toISOString() ?? null,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createPosition(
  data: Omit<PositionDoc, '_id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');
  const now = new Date();
  const result = await db.collection(POSITIONS).insertOne({ ...data, createdAt: now, updatedAt: now });
  return result.insertedId.toHexString();
}

/** Returns only open (closedAt: null) positions for a portfolio. */
export async function findOpenPositionsByPortfolioId(
  portfolioId: string | ObjectId,
): Promise<Position[]> {
  const db = await getMongoDb();
  if (!db) return [];
  const docs = await db
    .collection<PositionDoc>(POSITIONS)
    .find({ portfolioId: toId(portfolioId), closedAt: null })
    .sort({ stakedAt: -1 })
    .toArray();
  return docs.map(toPosition);
}

export async function findAllPositionsByUserId(userId: string | ObjectId): Promise<Position[]> {
  const db = await getMongoDb();
  if (!db) return [];
  const docs = await db
    .collection<PositionDoc>(POSITIONS)
    .find({ userId: toId(userId) })
    .sort({ stakedAt: -1 })
    .toArray();
  return docs.map(toPosition);
}

export async function findPositionById(id: string | ObjectId): Promise<Position | null> {
  const db = await getMongoDb();
  if (!db) return null;
  const doc = await db.collection<PositionDoc>(POSITIONS).findOne({ _id: toId(id) });
  return doc ? toPosition(doc) : null;
}

export async function updatePosition(
  id: string | ObjectId,
  data: Partial<Pick<PositionDoc, 'amount' | 'notes'>>,
): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(POSITIONS).updateOne(
    { _id: toId(id), closedAt: null },
    { $set: { ...data, updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

export async function closePosition(id: string | ObjectId): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(POSITIONS).updateOne(
    { _id: toId(id), closedAt: null },
    { $set: { closedAt: new Date(), updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

export async function getPositionStats(userId: string | ObjectId): Promise<PositionStats> {
  const db = await getMongoDb();
  if (!db) return { totalPositions: 0, openPositions: 0, totalValue: 0, weightedApr: 0 };

  const pipeline = [
    { $match: { userId: toId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$closedAt', null] }, 1, 0] } },
        value: { $sum: { $cond: [{ $eq: ['$closedAt', null] }, '$amount', 0] } },
        weightedSum: {
          $sum: {
            $cond: [
              { $eq: ['$closedAt', null] },
              { $multiply: ['$amount', '$aprAtEntry'] },
              0,
            ],
          },
        },
      },
    },
  ];

  const [row] = await db.collection(POSITIONS).aggregate(pipeline).toArray();
  if (!row) return { totalPositions: 0, openPositions: 0, totalValue: 0, weightedApr: 0 };

  return {
    totalPositions: row.total as number,
    openPositions: row.open as number,
    totalValue: row.value as number,
    weightedApr: row.value > 0 ? (row.weightedSum as number) / (row.value as number) : 0,
  };
}

/** Record an APR/value snapshot for a position (called by the daily snapshot job). */
export async function savePositionSnapshot(
  positionId: string | ObjectId,
  apr: number,
  value: number | null,
): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;
  await db.collection(HISTORY).insertOne({
    positionId: toId(positionId),
    apr,
    value,
    recordedAt: new Date(),
  });
}

export async function getPositionSnapshots(
  positionId: string | ObjectId,
  days = 30,
): Promise<{ apr: number; value: number | null; recordedAt: string }[]> {
  const db = await getMongoDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const docs = await db
    .collection<PositionHistoryDoc>(HISTORY)
    .find({ positionId: toId(positionId), recordedAt: { $gte: since } })
    .sort({ recordedAt: 1 })
    .toArray();
  return docs.map((d) => ({
    apr: d.apr,
    value: d.value,
    recordedAt: d.recordedAt.toISOString(),
  }));
}
