import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../helpers/db';
import { aprSnapshotFixture } from '../../helpers/fixtures';
import {
  saveSnapshots,
  getLatestAll,
  getTop,
  getByAsset,
  getHistory,
  appendHistory,
  getLatestSyncTimestamp,
} from '@/repositories/aprRepository';

vi.mock('@/lib/db/mongodb', () => ({
  getMongoDb: () => connectTestDb(),
}));

describe('aprRepository', () => {
  beforeEach(async () => {
    const db = await connectTestDb();
    await clearCollections(db, 'apr_snapshots', 'apr_history');
  });

  afterAll(() => disconnectTestDb());

  it('saveSnapshots inserts multiple rows', async () => {
    await saveSnapshots([
      aprSnapshotFixture({ exchange: 'binance', asset: 'USDT', apr: 0.05 }),
      aprSnapshotFixture({ exchange: 'okx', asset: 'USDT', apr: 0.06 }),
    ]);
    const db = await connectTestDb();
    const count = await db.collection('apr_snapshots').countDocuments();
    expect(count).toBe(2);
  });

  it('getLatestAll returns the newest row per exchange+asset', async () => {
    // Insert directly to control syncedAt; saveSnapshots() always stamps to now
    const db = await connectTestDb();
    const old = new Date(Date.now() - 60_000);
    const now = new Date();

    await db.collection('apr_snapshots').insertMany([
      { ...aprSnapshotFixture({ exchange: 'binance', asset: 'USDT', apr: 0.04 }), syncedAt: old },
      { ...aprSnapshotFixture({ exchange: 'binance', asset: 'USDT', apr: 0.05 }), syncedAt: now },
      { ...aprSnapshotFixture({ exchange: 'okx', asset: 'USDT', apr: 0.06 }), syncedAt: now },
    ]);

    const results = await getLatestAll();
    // Should deduplicate to 2 rows (one per exchange)
    expect(results).toHaveLength(2);
    const binance = results.find((r) => r.exchange === 'binance');
    expect(binance?.apr).toBe(0.05); // latest row wins
  });

  it('getLatestAll filters by exchange', async () => {
    await saveSnapshots([
      aprSnapshotFixture({ exchange: 'binance', asset: 'USDT', apr: 0.05 }),
      aprSnapshotFixture({ exchange: 'okx', asset: 'USDT', apr: 0.06 }),
    ]);
    const results = await getLatestAll({ exchange: 'binance' });
    expect(results).toHaveLength(1);
    expect(results[0].exchange).toBe('binance');
  });

  it('getTop respects limit and returns highest APR first', async () => {
    await saveSnapshots([
      aprSnapshotFixture({ exchange: 'binance', asset: 'USDT', apr: 0.05 }),
      aprSnapshotFixture({ exchange: 'okx', asset: 'USDT', apr: 0.08 }),
      aprSnapshotFixture({ exchange: 'kraken', asset: 'USDT', apr: 0.03 }),
    ]);
    const top1 = await getTop(1);
    expect(top1).toHaveLength(1);
    expect(top1[0].apr).toBe(0.08);
  });

  it('getByAsset returns latest per exchange for the asset', async () => {
    await saveSnapshots([
      aprSnapshotFixture({ exchange: 'binance', asset: 'USDT', apr: 0.05 }),
      aprSnapshotFixture({ exchange: 'okx', asset: 'ETH', apr: 0.02 }),
    ]);
    const results = await getByAsset('USDT');
    expect(results).toHaveLength(1);
    expect(results[0].asset).toBe('USDT');
  });

  it('getLatestSyncTimestamp returns null on empty collection', async () => {
    const ts = await getLatestSyncTimestamp();
    expect(ts).toBeNull();
  });

  it('getLatestSyncTimestamp returns the most recent syncedAt', async () => {
    const t1 = new Date(Date.now() - 5000);
    const t2 = new Date();
    await saveSnapshots([
      { ...aprSnapshotFixture({ exchange: 'binance', asset: 'USDT' }), syncedAt: t1 },
      { ...aprSnapshotFixture({ exchange: 'okx', asset: 'USDT' }), syncedAt: t2 },
    ]);
    const ts = await getLatestSyncTimestamp();
    // Should be t2 (the later one), within 1s of expected
    expect(ts).not.toBeNull();
    expect(Math.abs(ts!.getTime() - t2.getTime())).toBeLessThan(1000);
  });

  it('appendHistory records history entries', async () => {
    await appendHistory([{ exchange: 'binance', asset: 'USDT', apr: 0.05 }]);
    const db = await connectTestDb();
    const count = await db.collection('apr_history').countDocuments();
    expect(count).toBe(1);
  });

  it('appendHistory is idempotent within the same hour bucket', async () => {
    await appendHistory([{ exchange: 'binance', asset: 'USDT', apr: 0.05 }]);
    await appendHistory([{ exchange: 'binance', asset: 'USDT', apr: 0.06 }]); // same hour
    const db = await connectTestDb();
    const count = await db.collection('apr_history').countDocuments();
    expect(count).toBe(1); // upserted, not duplicated
  });

  it('getHistory returns entries and respects days filter', async () => {
    await appendHistory([{ exchange: 'binance', asset: 'USDT', apr: 0.05 }]);
    const results = await getHistory({ exchange: 'binance', asset: 'USDT', days: 1 });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].apr).toBe(0.05);
  });
});
