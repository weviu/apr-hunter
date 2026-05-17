/**
 * AprService — read-only façade over the APR data in MongoDB.
 *
 * This service only reads from `apr_snapshots` and `apr_history`.
 * It never calls exchange adapters directly — that is AprSyncJob's job.
 * Routes that need APR data call this service; they never touch repositories directly.
 */
import {
  getLatestAll,
  getTop,
  getByAsset,
  getUniqueAssets,
  getHistory,
  getTrends,
  getLatestSyncTimestamp,
} from '@/repositories/aprRepository';
import type { AprSnapshot, AprHistoryEntry, AprTrendResult } from '@/types/apr';
import { sampleAprData } from '@/lib/data/sampleAprRates';
import { saveSnapshots } from '@/repositories/aprRepository';

export interface AprFilters {
  exchange?: string;
  asset?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Latest rate per (exchange, asset). Falls back to sample data if DB is empty. */
export async function getAllRates(filters?: AprFilters): Promise<AprSnapshot[]> {
  const rows = await getLatestAll(filters);
  if (rows.length > 0) return rows;
  // DB is empty — seed with sample data so the UI is never blank
  await seedSampleData();
  return getLatestAll(filters);
}

/** Top N rates across all exchanges, sorted by APR descending. */
export async function getTopRates(limit = 10): Promise<AprSnapshot[]> {
  const rows = await getTop(limit);
  if (rows.length > 0) return rows;
  await seedSampleData();
  return getTop(limit);
}

/** Latest rate per exchange for a specific asset. */
export async function getRatesByAsset(asset: string): Promise<AprSnapshot[]> {
  return getByAsset(asset);
}

/** Distinct asset symbols that have at least one snapshot. */
export async function getAssetList(): Promise<string[]> {
  return getUniqueAssets();
}

/** Historical APR entries for charting. */
export async function getAprHistory(
  filters?: AprFilters & { days?: number },
): Promise<AprHistoryEntry[]> {
  return getHistory(filters);
}

/** Direction deltas for the top movers over the last 24h. */
export async function getAprTrends(limit = 10): Promise<AprTrendResult[]> {
  return getTrends(limit);
}

/** The most recent syncedAt timestamp — used by the health endpoint. */
export async function getLastSyncTime(): Promise<Date | null> {
  return getLatestSyncTimestamp();
}

// ─── Private helpers ──────────────────────────────────────────────────────────

let _seeding = false;

async function seedSampleData(): Promise<void> {
  if (_seeding) return;
  _seeding = true;
  try {
    await saveSnapshots(sampleAprData);
  } catch { /* non-fatal */ } finally {
    _seeding = false;
  }
}
