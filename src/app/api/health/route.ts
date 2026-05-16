import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';
import { isLiveFetchEnabled } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await getMongoDb();

  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database unavailable',
        code: 'DB_UNAVAILABLE',
        data: {
          db: 'error',
          lastSyncAt: null,
          syncAgeSeconds: null,
          mode: 'sample',
        },
      },
      { status: 503 },
    );
  }

  // Fetch the most recent snapshot's syncedAt to compute staleness
  let lastSyncAt: string | null = null;
  let syncAgeSeconds: number | null = null;

  try {
    const latestSnapshot = await db
      .collection('apr_snapshots')
      .findOne({}, { sort: { syncedAt: -1 }, projection: { syncedAt: 1 } });

    if (latestSnapshot?.syncedAt instanceof Date) {
      lastSyncAt = latestSnapshot.syncedAt.toISOString();
      syncAgeSeconds = Math.floor((Date.now() - latestSnapshot.syncedAt.getTime()) / 1000);
    }
  } catch {
    // Non-fatal — health check still reports DB as connected
  }

  return NextResponse.json({
    success: true,
    data: {
      db: 'connected',
      lastSyncAt,
      syncAgeSeconds,
      mode: isLiveFetchEnabled ? 'live' : 'sample',
    },
  });
}
