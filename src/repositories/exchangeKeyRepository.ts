import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';

const COL = 'exchange_keys';

export type Exchange = 'binance' | 'okx' | 'kucoin' | 'kraken';

export interface ExchangeKeyDocument {
  _id: ObjectId;
  userId: ObjectId;
  exchange: Exchange;
  apiKey: string;       // AES-256-GCM encrypted
  apiSecret: string;    // AES-256-GCM encrypted
  passphrase: string | null;  // KuCoin only; encrypted
  createdAt: Date;
  lastVerifiedAt: Date | null;
}

function toId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

/**
 * Insert or replace the API key set for a (user, exchange) pair.
 * Enforced unique by the { userId, exchange } index.
 */
export async function upsertExchangeKey(
  userId: string | ObjectId,
  exchange: Exchange,
  data: {
    apiKey: string;
    apiSecret: string;
    passphrase: string | null;
    lastVerifiedAt: Date | null;
  },
): Promise<void> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');
  const uid = toId(userId);
  await db.collection(COL).updateOne(
    { userId: uid, exchange },
    {
      $set: {
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        passphrase: data.passphrase,
        lastVerifiedAt: data.lastVerifiedAt,
      },
      $setOnInsert: {
        userId: uid,
        exchange,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function findExchangeKeysByUserId(
  userId: string | ObjectId,
): Promise<ExchangeKeyDocument[]> {
  const db = await getMongoDb();
  if (!db) return [];
  return db
    .collection<ExchangeKeyDocument>(COL)
    .find({ userId: toId(userId) })
    .toArray();
}

export async function findExchangeKeyByUserAndExchange(
  userId: string | ObjectId,
  exchange: Exchange,
): Promise<ExchangeKeyDocument | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db
    .collection<ExchangeKeyDocument>(COL)
    .findOne({ userId: toId(userId), exchange });
}

export async function deleteExchangeKey(
  userId: string | ObjectId,
  exchange: Exchange,
): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db
    .collection(COL)
    .deleteOne({ userId: toId(userId), exchange });
  return result.deletedCount > 0;
}
