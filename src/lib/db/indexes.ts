/**
 * Ensures all MongoDB indexes exist for production collections.
 * Called once on app startup (e.g. in Next.js instrumentation.ts).
 *
 * All createIndex calls are idempotent — safe to re-run on every deploy.
 */
import { Db } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';

export async function ensureIndexes(db?: Db): Promise<void> {
  const resolvedDb = db ?? (await getMongoDb());
  if (!resolvedDb) {
    console.warn('[indexes] Database unavailable — skipping index creation');
    return;
  }

  await Promise.all([
    // users
    resolvedDb.collection('users').createIndex({ email: 1 }, { unique: true }),

    // sessions
    resolvedDb.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
    resolvedDb.collection('sessions').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },    // TTL: MongoDB deletes expired docs automatically
    ),
    resolvedDb.collection('sessions').createIndex({ userId: 1 }),

    // exchange_keys
    resolvedDb.collection('exchange_keys').createIndex(
      { userId: 1, exchange: 1 },
      { unique: true },
    ),

    // apr_snapshots
    resolvedDb.collection('apr_snapshots').createIndex({ syncedAt: -1 }),
    resolvedDb.collection('apr_snapshots').createIndex({ exchange: 1, asset: 1, syncedAt: -1 }),
    resolvedDb.collection('apr_snapshots').createIndex({ asset: 1, syncedAt: -1 }),

    // apr_history
    resolvedDb.collection('apr_history').createIndex({ exchange: 1, asset: 1, hourBucket: -1 }),
    resolvedDb.collection('apr_history').createIndex({ recordedAt: -1 }),

    // portfolios
    resolvedDb.collection('portfolios').createIndex({ userId: 1, deletedAt: 1 }),

    // positions
    resolvedDb.collection('positions').createIndex({ portfolioId: 1, closedAt: 1 }),
    resolvedDb.collection('positions').createIndex({ userId: 1, closedAt: 1 }),

    // position_history
    resolvedDb.collection('position_history').createIndex({ positionId: 1, recordedAt: -1 }),

    // alerts
    resolvedDb.collection('alerts').createIndex({ userId: 1, active: 1 }),
    resolvedDb.collection('alerts').createIndex({ asset: 1, active: 1 }),

    // notifications
    resolvedDb.collection('notifications').createIndex({ userId: 1, read: 1, createdAt: -1 }),
  ]);

  console.log('[indexes] All indexes verified');
}
