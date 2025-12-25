import { getMongoDb } from '@/lib/db/mongodb';
import { AprOpportunity } from '@/types/apr';

const SNAPSHOTS = 'apr_snapshots';
const HISTORY = 'apr_history';

export async function saveAprSnapshots(data: AprOpportunity[], fetchedAt: string) {
  const db = await getMongoDb();
  if (!db || data.length === 0) return;

  await db.collection(SNAPSHOTS).insertMany(
    data.map((doc) => ({
      ...doc,
      fetchedAt,
    })),
    { ordered: false },
  );
}

export async function getLatestAprForAsset(symbol: string) {
  const db = await getMongoDb();
  if (!db) return [];

  const pipeline = [
    { $match: { symbol: symbol.toUpperCase() } },
    { $sort: { fetchedAt: -1 } },
    {
      $group: {
        _id: '$platform',
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
  ];

  const rows = await db.collection(SNAPSHOTS).aggregate<AprOpportunity>(pipeline).toArray();
  return rows;
}

export async function getTopAprOpportunities(limit = 10) {
  const db = await getMongoDb();
  if (!db) return [];

  const pipeline = [
    // Prefer freshest data first, then highest apr
    { $sort: { fetchedAt: -1, apr: -1 } },
    {
      $group: {
        _id: { platform: '$platform', symbol: '$symbol' },
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { apr: -1 } },
    { $limit: limit },
  ];

  return db.collection(SNAPSHOTS).aggregate<AprOpportunity>(pipeline).toArray();
}

// Append to history with a simple rate limit (avoid flooding)
export async function appendAprHistory(data: AprOpportunity[], capturedAt: string) {
  const db = await getMongoDb();
  if (!db || data.length === 0) return;

  const ops = data.map((row) => ({
    updateOne: {
      filter: {
        platform: row.platform,
        asset: row.asset,
        // avoid inserting if we already have a point in the last hour
        capturedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      },
      update: {
        $setOnInsert: {
          platform: row.platform,
          asset: row.asset,
          symbol: row.symbol,
          platformType: row.platformType,
          chain: row.chain,
          riskLevel: row.riskLevel,
          lastUpdated: row.lastUpdated,
          capturedAt,
        },
        $set: {
          apr: row.apr,
          apy: row.apy,
          source: row.source,
        },
      },
      upsert: true,
    },
  }));

  await db.collection(HISTORY).bulkWrite(ops, { ordered: false });
}

export async function getAprHistory(asset: string, platform: string, sinceIso?: string, limit = 200) {
  const db = await getMongoDb();
  if (!db) return [];
  const match: any = { asset: asset.toUpperCase(), platform };
  if (sinceIso) {
    match.capturedAt = { $gte: sinceIso };
  }
  return db
    .collection(HISTORY)
    .find(match)
    .sort({ capturedAt: -1 })
    .limit(limit)
    .toArray();
}
