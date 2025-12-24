import { getMongoDb } from '@/lib/db/mongodb';
import { AprOpportunity } from '@/types/apr';

const COLLECTION = 'apr_snapshots';

export async function saveAprSnapshots(data: AprOpportunity[], fetchedAt: string) {
  const db = await getMongoDb();
  if (!db || data.length === 0) return;

  await db.collection(COLLECTION).insertMany(
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

  const rows = await db.collection(COLLECTION).aggregate<AprOpportunity>(pipeline).toArray();
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

  return db.collection(COLLECTION).aggregate<AprOpportunity>(pipeline).toArray();
}
