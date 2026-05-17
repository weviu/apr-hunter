import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock repositories ────────────────────────────────────────────────────────
vi.mock('@/repositories/aprRepository', () => ({
  getLatestAll: vi.fn(),
  getTop: vi.fn(),
  getByAsset: vi.fn(),
  getUniqueAssets: vi.fn(),
  getHistory: vi.fn(),
  getTrends: vi.fn(),
  getLatestSyncTimestamp: vi.fn(),
  saveSnapshots: vi.fn(),
}));

vi.mock('@/lib/data/sampleAprRates', () => ({
  sampleAprData: [
    {
      exchange: 'kraken',
      asset: 'ETH',
      product: 'staking',
      apr: 0.04,
      apy: null,
      minAmount: null,
      currency: 'USD',
      source: 'sample',
      syncedAt: new Date(),
    },
  ],
}));

import * as aprRepo from '@/repositories/aprRepository';
import {
  getAllRates,
  getTopRates,
  getRatesByAsset,
  getAssetList,
  getAprHistory,
  getAprTrends,
  getLastSyncTime,
} from '@/services/AprService';
import type { AprSnapshot } from '@/types/apr';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<AprSnapshot> = {}): AprSnapshot {
  return {
    id: 'snap1',
    exchange: 'kraken',
    asset: 'ETH',
    product: 'staking',
    apr: 0.04,
    apy: null,
    minAmount: null,
    currency: 'USD',
    source: 'live',
    syncedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AprService — getAllRates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns snapshots from the repository', async () => {
    const snaps = [makeSnapshot()];
    vi.mocked(aprRepo.getLatestAll).mockResolvedValue(snaps);

    const result = await getAllRates();

    expect(result).toEqual(snaps);
    expect(aprRepo.getLatestAll).toHaveBeenCalledOnce();
  });

  it('seeds sample data and retries when DB is empty', async () => {
    vi.mocked(aprRepo.getLatestAll)
      .mockResolvedValueOnce([]) // first call — empty
      .mockResolvedValueOnce([makeSnapshot({ source: 'sample' })]); // after seed
    vi.mocked(aprRepo.saveSnapshots).mockResolvedValue();

    const result = await getAllRates();

    expect(aprRepo.saveSnapshots).toHaveBeenCalledOnce();
    expect(result[0].source).toBe('sample');
  });

  it('passes filters to the repository', async () => {
    vi.mocked(aprRepo.getLatestAll).mockResolvedValue([]);
    vi.mocked(aprRepo.saveSnapshots).mockResolvedValue();

    await getAllRates({ exchange: 'binance', asset: 'BTC' });

    expect(aprRepo.getLatestAll).toHaveBeenCalledWith({ exchange: 'binance', asset: 'BTC' });
  });
});

describe('AprService — getTopRates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns top rates from the repository', async () => {
    const snaps = [makeSnapshot({ apr: 0.12 }), makeSnapshot({ apr: 0.08 })];
    vi.mocked(aprRepo.getTop).mockResolvedValue(snaps);

    const result = await getTopRates(5);

    expect(result).toHaveLength(2);
    expect(aprRepo.getTop).toHaveBeenCalledWith(5);
  });
});

describe('AprService — getRatesByAsset', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to getByAsset', async () => {
    const snaps = [makeSnapshot()];
    vi.mocked(aprRepo.getByAsset).mockResolvedValue(snaps);

    const result = await getRatesByAsset('ETH');

    expect(result).toEqual(snaps);
    expect(aprRepo.getByAsset).toHaveBeenCalledWith('ETH');
  });
});

describe('AprService — getAssetList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to getUniqueAssets', async () => {
    vi.mocked(aprRepo.getUniqueAssets).mockResolvedValue(['ETH', 'BTC', 'USDC']);

    const result = await getAssetList();

    expect(result).toEqual(['ETH', 'BTC', 'USDC']);
  });
});

describe('AprService — getAprTrends', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to getTrends with limit', async () => {
    const trends = [{ asset: 'ETH', exchange: 'kraken', currentApr: 0.04, previousApr: 0.039, delta: 0.001, direction: 'up' as const }];
    vi.mocked(aprRepo.getTrends).mockResolvedValue(trends);

    const result = await getAprTrends(5);

    expect(result).toEqual(trends);
    expect(aprRepo.getTrends).toHaveBeenCalledWith(5);
  });
});

describe('AprService — getLastSyncTime', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no sync has happened', async () => {
    vi.mocked(aprRepo.getLatestSyncTimestamp).mockResolvedValue(null);

    const result = await getLastSyncTime();
    expect(result).toBeNull();
  });

  it('returns the timestamp when a sync has occurred', async () => {
    const ts = new Date('2024-01-01T12:00:00Z');
    vi.mocked(aprRepo.getLatestSyncTimestamp).mockResolvedValue(ts);

    const result = await getLastSyncTime();
    expect(result).toEqual(ts);
  });
});
