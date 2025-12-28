import { getMongoDb } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Portfolio Repository
 * Handles all data access for user portfolios, positions, and snapshots
 */

// Collection names
const PORTFOLIOS = 'portfolios';
const POSITIONS = 'positions';
const POSITION_HISTORY = 'position_history';

export interface Portfolio {
  _id?: ObjectId;
  userId: ObjectId | string;
  name: string;
  description?: string;
  type: 'web2' | 'web3'; // Web2 (manual) or Web3 (wallet-connected)
  walletAddress?: string; // For Web3 portfolios
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  _id?: ObjectId;
  portfolioId: ObjectId | string;
  userId: ObjectId | string;
  symbol: string;
  asset: string;
  platform: string; // e.g., 'Binance', 'Kraken', 'Aave'
  platformType: string; // 'exchange' | 'defi'
  chain?: string; // Ethereum, BSC, Polygon, etc.
  amount: number;
  apr?: number;
  riskLevel?: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PositionSnapshot {
  _id?: ObjectId;
  positionId: ObjectId | string;
  portfolioId: ObjectId | string;
  userId: ObjectId | string;
  symbol: string;
  amount: number;
  value?: number; // USD value at snapshot time
  apr?: number;
  capturedAt: string;
}

// ============ Portfolio Operations ============

export async function createPortfolio(userId: ObjectId | string, data: Omit<Portfolio, '_id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');

  const now = new Date().toISOString();
  const doc: Portfolio = {
    userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection(PORTFOLIOS).insertOne(doc as any);
  return result.insertedId;
}

export async function getPortfolioById(portfolioId: ObjectId | string): Promise<Portfolio | null> {
  const db = await getMongoDb();
  if (!db) return null;

  const id = typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId;
  return db.collection(PORTFOLIOS).findOne({ _id: id }) as Promise<Portfolio | null>;
}

export async function getUserPortfolios(userId: ObjectId | string): Promise<Portfolio[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  return db.collection(PORTFOLIOS).find({ userId: id }).sort({ createdAt: -1 }).toArray() as Promise<Portfolio[]>;
}

export async function updatePortfolio(portfolioId: ObjectId | string, updates: Partial<Portfolio>): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;

  const id = typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId;
  const result = await db.collection(PORTFOLIOS).updateOne(
    { _id: id },
    { $set: { ...updates, updatedAt: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

export async function deletePortfolio(portfolioId: ObjectId | string): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;

  const id = typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId;

  // Delete all positions and history for this portfolio
  await db.collection(POSITIONS).deleteMany({ portfolioId: id });
  await db.collection(POSITION_HISTORY).deleteMany({ portfolioId: id });

  // Delete the portfolio
  const result = await db.collection(PORTFOLIOS).deleteOne({ _id: id });
  return result.deletedCount > 0;
}

// ============ Position Operations ============

export async function createPosition(portfolioId: ObjectId | string, userId: ObjectId | string, data: Omit<Position, '_id' | 'portfolioId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');

  const now = new Date().toISOString();
  const doc: Position = {
    portfolioId: typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId,
    userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection(POSITIONS).insertOne(doc as any);
  return result.insertedId;
}

export async function getPositionById(positionId: ObjectId | string): Promise<Position | null> {
  const db = await getMongoDb();
  if (!db) return null;

  const id = typeof positionId === 'string' ? new ObjectId(positionId) : positionId;
  return db.collection(POSITIONS).findOne({ _id: id }) as Promise<Position | null>;
}

export async function getPortfolioPositions(portfolioId: ObjectId | string): Promise<Position[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const id = typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId;
  return db.collection(POSITIONS).find({ portfolioId: id, isActive: true }).toArray() as Promise<Position[]>;
}

export async function updatePosition(positionId: ObjectId | string, updates: Partial<Position>): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;

  const id = typeof positionId === 'string' ? new ObjectId(positionId) : positionId;
  const result = await db.collection(POSITIONS).updateOne(
    { _id: id },
    { $set: { ...updates, updatedAt: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

export async function deletePosition(positionId: ObjectId | string): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;

  const id = typeof positionId === 'string' ? new ObjectId(positionId) : positionId;

  // Archive snapshots instead of deleting
  const position = await getPositionById(id);
  if (position) {
    await db.collection(POSITION_HISTORY).deleteMany({ positionId: id });
  }

  // Mark position as inactive or delete
  const result = await db.collection(POSITIONS).deleteOne({ _id: id });
  return result.deletedCount > 0;
}

// ============ Position Snapshot Operations ============

export async function recordPositionSnapshot(positionId: ObjectId | string, portfolioId: ObjectId | string, userId: ObjectId | string, snapshot: Omit<PositionSnapshot, '_id' | 'positionId' | 'portfolioId' | 'userId'>): Promise<ObjectId> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');

  const doc: PositionSnapshot = {
    positionId: typeof positionId === 'string' ? new ObjectId(positionId) : positionId,
    portfolioId: typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId,
    userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
    ...snapshot,
  };

  const result = await db.collection(POSITION_HISTORY).insertOne(doc as any);
  return result.insertedId;
}

export async function getPositionHistory(positionId: ObjectId | string, limit = 100): Promise<PositionSnapshot[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const id = typeof positionId === 'string' ? new ObjectId(positionId) : positionId;
  return db
    .collection(POSITION_HISTORY)
    .find({ positionId: id })
    .sort({ capturedAt: -1 })
    .limit(limit)
    .toArray() as Promise<PositionSnapshot[]>;
}

export async function getPortfolioSnapshot(portfolioId: ObjectId | string, before?: string): Promise<PositionSnapshot[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const id = typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId;
  const query: any = { portfolioId: id };
  if (before) {
    query.capturedAt = { $lt: before };
  }

  return db
    .collection(POSITION_HISTORY)
    .find(query)
    .sort({ capturedAt: -1 })
    .toArray() as Promise<PositionSnapshot[]>;
}

// ============ Analytics & Aggregations ============

export async function getPortfolioStats(portfolioId: ObjectId | string) {
  const db = await getMongoDb();
  if (!db) return null;

  const id = typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId;

  const positions = await getPortfolioPositions(id);
  const totalAmount = positions.reduce((sum, p) => sum + p.amount, 0);
  const avgApr = positions.length > 0 ? positions.reduce((sum, p) => sum + (p.apr || 0), 0) / positions.length : 0;

  return {
    totalPositions: positions.length,
    totalAmount,
    avgApr,
    positions,
  };
}

export async function syncWeb3Positions(portfolioId: ObjectId | string, userId: ObjectId | string, newPositions: any[]): Promise<void> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');

  // Mark existing positions as inactive
  await db.collection(POSITIONS).updateMany(
    { portfolioId: typeof portfolioId === 'string' ? new ObjectId(portfolioId) : portfolioId },
    { $set: { isActive: false } }
  );

  // Insert new positions
  for (const pos of newPositions) {
    await createPosition(portfolioId, userId, { ...pos, isActive: true });
  }
}
