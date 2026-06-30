/**
 * Integration test for AprSyncJob.
 *
 * All HTTP fetch calls are intercepted with vi.stubGlobal('fetch', ...) so that
 * tests never hit real exchange APIs. The job writes to the test MongoDB database.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../helpers/db';
import type { Db } from 'mongodb';

// ─── Redirect DB calls to the test database ───────────────────────────────────
vi.mock('@/lib/db/mongodb', () => ({
  getMongoDb: () => connectTestDb(),
  closeMongoConnection: () => Promise.resolve(),
}));

// ─── Mock env  disable live fetch so we can control what gets called ─────────
vi.mock('@/lib/env', () => ({
  env: {
    ENABLE_LIVE_EXCHANGE_FETCH: 'false',
    BINANCE_API_KEY: '',
    BINANCE_API_SECRET: '',
    OKX_API_KEY: '',
    OKX_API_SECRET: '',
    OKX_PASSPHRASE: '',
    KUCOIN_API_KEY: '',
    KUCOIN_API_SECRET: '',
    KUCOIN_PASSPHRASE: '',
  },
  isLiveFetchEnabled: false,
}));

import { runAprSync } from '@/services/AprSyncJob';

// ─── Setup ────────────────────────────────────────────────────────────────────

let db: Db;

beforeAll(async () => {
  db = await connectTestDb();
});

beforeEach(async () => {
  await clearCollections(db, 'apr_snapshots', 'apr_history');
});

afterAll(() => disconnectTestDb());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AprSyncJob  runAprSync (sample mode)', () => {
  it('writes sample snapshots to the database when live fetch is disabled', async () => {
    const result = await runAprSync();

    expect(result.success).toBe(true);
    expect(result.source).toBe('sample');
    expect(result.snapshotCount).toBeGreaterThan(0);

    const count = await db.collection('apr_snapshots').countDocuments();
    expect(count).toBeGreaterThan(0);
  });

  it('writes history entries to apr_history', async () => {
    await runAprSync();

    const count = await db.collection('apr_history').countDocuments();
    expect(count).toBeGreaterThan(0);
  });

  it('returns duration in milliseconds', async () => {
    const result = await runAprSync();

    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('each sync run appends snapshots to apr_snapshots', async () => {
    await runAprSync();
    const countAfterFirst = await db.collection('apr_snapshots').countDocuments();
    expect(countAfterFirst).toBeGreaterThan(0);

    await runAprSync();
    const countAfterSecond = await db.collection('apr_snapshots').countDocuments();

    // saveSnapshots uses insertMany  each sync adds a new timestamped batch
    expect(countAfterSecond).toBeGreaterThan(countAfterFirst);
  });
});

describe('AprSyncJob  runAprSync (live mode with mocked fetch)', () => {
  beforeEach(() => {
    // Override env to enable live fetch for this block
    vi.doMock('@/lib/env', () => ({
      env: {
        ENABLE_LIVE_EXCHANGE_FETCH: 'true',
        BINANCE_API_KEY: '',
        BINANCE_API_SECRET: '',
        OKX_API_KEY: '',
        OKX_API_SECRET: '',
        OKX_PASSPHRASE: '',
        KUCOIN_API_KEY: '',
        KUCOIN_API_SECRET: '',
        KUCOIN_PASSPHRASE: '',
      },
      isLiveFetchEnabled: true,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to sample data when all live adapters fail', async () => {
    // Stub fetch to always reject
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await runAprSync();

    // sample fallback should still produce rows
    expect(result.snapshotCount).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });
});
