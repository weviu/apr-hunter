import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { AprSnapshot, AprHistoryEntry, AprTrendResult } from '@/types/apr';

const SNAPSHOTS = 'apr_snapshots';
const HISTORY = 'apr_history';

/**
 * Snapshots older than this are excluded from "current rate" listings, so a
 * silently-failed sync can't keep surfacing weeks-old APRs as if they were live.
 * The sync writes fresh snapshots (live or sample) every cycle, so anything
 * older than this means that (exchange, asset) has had no successful sync since.
 * History/trend reads are intentionally NOT filtered — they're time-series.
 */
const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/** Cutoff Date for the freshness filter on current-rate reads. */
function freshnessCutoff(): Date {
  return new Date(Date.now() - MAX_SNAPSHOT_AGE_MS);
}

// ─── Internal document types ─────────────────────────────────────────────────

interface SnapshotDoc {
  _id: ObjectId;
  exchange: string;
  asset: string;
  product: string | null;
  apr: number;
  apy: number | null;
  minAmount: number | null;
  currency: string;
  source: 'live' | 'sample';
  syncedAt: Date;
}

interface HistoryDoc {
  _id: ObjectId;
  exchange: string;
  asset: string;
  apr: number;
  recordedAt: Date;
}

// ─── Serialisation helpers ────────────────────────────────────────────────────

function toSnapshot(doc: SnapshotDoc): AprSnapshot {
  return {
    id: doc._id.toHexString(),
    exchange: doc.exchange,
    asset: doc.asset,
    product: doc.product,
    apr: doc.apr,
    apy: doc.apy,
    minAmount: doc.minAmount,
    currency: doc.currency,
    source: doc.source,
    syncedAt: doc.syncedAt.toISOString(),
  };
}

function toHistoryEntry(doc: HistoryDoc): AprHistoryEntry {
  return {
    id: doc._id.toHexString(),
    exchange: doc.exchange,
    asset: doc.asset,
    apr: doc.apr,
    recordedAt: doc.recordedAt.toISOString(),
  };
}

// ─── Write operations ─────────────────────────────────────────────────────────

/** Input type for inserting snapshots — uses Date for syncedAt (converted to ISO by the DB layer). */
export type SnapshotInsert = Omit<AprSnapshot, 'id' | 'syncedAt'> & { syncedAt: Date };

/** Bulk-insert APR snapshots. Ignores partial failures (ordered: false). */
export async function saveSnapshots(snapshots: SnapshotInsert[]): Promise<void> {
  const db = await getMongoDb();
  if (!db || snapshots.length === 0) return;
  const now = new Date();
  await db.collection(SNAPSHOTS).insertMany(
    snapshots.map((s) => ({ ...s, syncedAt: now })),
    { ordered: false },
  );
}

/**
 * Upsert hourly history buckets: one row per (exchange, asset, hour).
 * Calling this multiple times within the same hour is idempotent.
 */
export async function appendHistory(
  entries: Array<{ exchange: string; asset: string; apr: number }>,
): Promise<void> {
  const db = await getMongoDb();
  if (!db || entries.length === 0) return;

  const hourBucket = new Date();
  hourBucket.setUTCMinutes(0, 0, 0);

  const ops = entries.map((e) => ({
    updateOne: {
      filter: { exchange: e.exchange, asset: e.asset, hourBucket },
      update: {
        $set: { apr: e.apr, recordedAt: new Date() },
        $setOnInsert: { exchange: e.exchange, asset: e.asset, hourBucket },
      },
      upsert: true,
    },
  }));

  await db.collection(HISTORY).bulkWrite(ops, { ordered: false });
}

// ─── Read operations ──────────────────────────────────────────────────────────

/** Latest snapshot per (exchange, asset) pair, optionally filtered. */
export async function getLatestAll(filters?: {
  exchange?: string;
  asset?: string;
}): Promise<AprSnapshot[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const match: Record<string, unknown> = { syncedAt: { $gte: freshnessCutoff() } };
  if (filters?.exchange) match.exchange = filters.exchange;
  if (filters?.asset) match.asset = filters.asset.toUpperCase();

  const pipeline = [
    { $match: match },
    // Newest sync first, then highest APR — so $first is the best current
    // product for each (exchange, asset) when an exchange has several.
    { $sort: { syncedAt: -1, apr: -1 } },
    { $group: { _id: { exchange: '$exchange', asset: '$asset' }, doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { apr: -1 } },
  ];

  const docs = await db.collection(SNAPSHOTS).aggregate<SnapshotDoc>(pipeline).toArray();
  return docs.map(toSnapshot);
}

/** Top N rates across all exchanges, sorted by APR descending. */
export async function getTop(limit = 10): Promise<AprSnapshot[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const pipeline = [
    { $match: { syncedAt: { $gte: freshnessCutoff() } } },
    // Newest sync first, then highest APR — see getLatestAll.
    { $sort: { syncedAt: -1, apr: -1 } },
    { $group: { _id: { exchange: '$exchange', asset: '$asset' }, doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { apr: -1 } },
    { $limit: limit },
  ];

  const docs = await db.collection(SNAPSHOTS).aggregate<SnapshotDoc>(pipeline).toArray();
  return docs.map(toSnapshot);
}

/** Distinct asset names that have at least one snapshot. */
export async function getUniqueAssets(): Promise<string[]> {
  const db = await getMongoDb();
  if (!db) return [];
  return db.collection(SNAPSHOTS).distinct('asset');
}

/** Latest rate per exchange for a specific asset. */
export async function getByAsset(asset: string): Promise<AprSnapshot[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const pipeline = [
    { $match: { asset: asset.toUpperCase(), syncedAt: { $gte: freshnessCutoff() } } },
    { $sort: { syncedAt: -1 } },
    { $group: { _id: '$exchange', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { apr: -1 } },
  ];

  const docs = await db.collection(SNAPSHOTS).aggregate<SnapshotDoc>(pipeline).toArray();
  return docs.map(toSnapshot);
}

/**
 * All distinct products for an (asset, exchange) pair, each with its latest APR.
 * Feeds the "Add Position" product dropdown. Asset is matched case-insensitively
 * (uppercased); exchange is matched exactly as stored (lowercase).
 */
export async function getProductsForAssetExchange(
  asset: string,
  exchange: string,
): Promise<Array<{ product: string | null; apr: number; apy: number | null; syncedAt: string }>> {
  const db = await getMongoDb();
  if (!db) return [];

  const pipeline = [
    { $match: { asset: asset.toUpperCase(), exchange } },
    { $sort: { syncedAt: -1 } },
    { $group: { _id: '$product', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { apr: -1 } },
  ];

  const docs = await db.collection(SNAPSHOTS).aggregate<SnapshotDoc>(pipeline).toArray();
  return docs.map((d) => ({
    product: d.product,
    apr: d.apr,
    apy: d.apy,
    syncedAt: d.syncedAt.toISOString(),
  }));
}

/**
 * The latest APR for a specific (asset, exchange, product) triple — the live
 * join used when creating a position and when enriching the positions list.
 * Pass product = null to match snapshots with no product.
 */
export async function getLatestAprFor(
  asset: string,
  exchange: string,
  product: string | null,
): Promise<{ apr: number; apy: number | null; syncedAt: string } | null> {
  const db = await getMongoDb();
  if (!db) return null;

  const doc = await db.collection<SnapshotDoc>(SNAPSHOTS).findOne(
    { asset: asset.toUpperCase(), exchange, product: product ?? null },
    { sort: { syncedAt: -1 } },
  );
  if (!doc) return null;
  return { apr: doc.apr, apy: doc.apy, syncedAt: doc.syncedAt.toISOString() };
}

/** Historical APR entries, optionally filtered by exchange/asset/days. */
export async function getHistory(filters?: {
  exchange?: string;
  asset?: string;
  days?: number;
}): Promise<AprHistoryEntry[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const match: Record<string, unknown> = {};
  if (filters?.exchange) match.exchange = filters.exchange;
  if (filters?.asset) match.asset = filters.asset.toUpperCase();
  if (filters?.days) {
    const since = new Date();
    since.setDate(since.getDate() - filters.days);
    match.recordedAt = { $gte: since };
  }

  const docs = await db
    .collection<HistoryDoc>(HISTORY)
    .find(match)
    .sort({ recordedAt: -1 })
    .limit(2000)
    .toArray();

  return docs.map(toHistoryEntry);
}

/**
 * For each (exchange, asset) pair, compare the most recent rate to the rate
 * 24 hours ago and return the direction of change.
 */
export async function getTrends(limit = 10): Promise<AprTrendResult[]> {
  const db = await getMongoDb();
  if (!db) return [];

  const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h window

  const pipeline = [
    { $match: { recordedAt: { $gte: cutoff } } },
    { $sort: { recordedAt: -1 } },
    {
      $group: {
        _id: { exchange: '$exchange', asset: '$asset' },
        latest: { $first: '$apr' },
        oldest: { $last: '$apr' },
      },
    },
    {
      $project: {
        exchange: '$_id.exchange',
        asset: '$_id.asset',
        currentApr: '$latest',
        previousApr: '$oldest',
        delta: { $subtract: ['$latest', '$oldest'] },
      },
    },
    { $sort: { delta: -1 } },
    { $limit: limit },
  ];

  const rows = await db.collection(HISTORY).aggregate(pipeline).toArray();

  return rows.map((r) => ({
    exchange: r.exchange as string,
    asset: r.asset as string,
    currentApr: r.currentApr as number,
    previousApr: r.previousApr as number,
    delta: r.delta as number,
    direction: (r.delta as number) > 0.001
      ? 'up'
      : (r.delta as number) < -0.001
      ? 'down'
      : 'flat',
  }));
}

/** The most recent syncedAt across all snapshots; used by the health endpoint. */
export async function getLatestSyncTimestamp(): Promise<Date | null> {
  const db = await getMongoDb();
  if (!db) return null;
  const doc = await db
    .collection(SNAPSHOTS)
    .findOne({}, { sort: { syncedAt: -1 }, projection: { syncedAt: 1 } });
  return doc?.syncedAt instanceof Date ? doc.syncedAt : null;
}
