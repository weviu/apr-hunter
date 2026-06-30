/**
 * AprSyncJob — orchestrates one full APR sync cycle.
 *
 * Called by: POST /api/cron/refresh-apr (triggered by PM2 cron script).
 *
 * Flow:
 *   1. Call all exchange adapters in parallel (with allSettled)
 *   2. Merge results; fall back to sample data if ALL adapters fail
 *   3. Persist to `apr_snapshots`
 *   4. Persist hourly buckets to `apr_history`
 *   5. Evaluate active alerts against the new rates
 *
 * Each step is non-fatal: a failure in one exchange never aborts the rest.
 */
import { env } from '@/lib/env';
import { sampleAprData } from '@/lib/data/sampleAprRates';
import { shouldTrackSnapshot } from '@/lib/data/trackedAssets';
import { saveSnapshots, appendHistory } from '@/repositories/aprRepository';
import { findExchangeKeysByUserId } from '@/repositories/exchangeKeyRepository';
import type { SnapshotInsert } from '@/repositories/aprRepository';
import { fetchBinanceAprs } from '@/exchanges/binance';
import { fetchOkxAprs } from '@/exchanges/okx';
import { fetchKucoinAprs } from '@/exchanges/kucoin';
import { fetchAaveAprs } from '@/exchanges/aave';
import { fetchYearnAprs } from '@/exchanges/yearn';
import { decrypt } from '@/lib/crypto/encryption';
import { evaluateAlerts } from '@/services/AlertService';
import { getPrices } from '@/lib/prices/coin-gecko';

export interface SyncResult {
  success: boolean;
  source: 'live' | 'sample';
  snapshotCount: number;
  errors: string[];
  durationMs: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runAprSync(): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];

  let snapshots: SnapshotInsert[] = [];

  if (env.ENABLE_LIVE_EXCHANGE_FETCH === 'true') {
    snapshots = await fetchLiveRates(errors);
    // Drop CEX rows for non-allowlisted assets (meme/micro-cap noise). DeFi
    // rows pass through — see trackedAssets.ts.
    snapshots = snapshots.filter((s) => shouldTrackSnapshot(s.exchange, s.asset));
  }

  const source: 'live' | 'sample' = snapshots.length > 0 ? 'live' : 'sample';

  // Surface per-exchange failures so a broken/expired key is visible in cron
  // output instead of silently leaving that exchange's rates to go stale.
  if (errors.length > 0) {
    console.warn(`[sync] completed with ${errors.length} exchange failure(s): ${errors.join(' | ')}`);
  }

  if (snapshots.length === 0) {
    console.log('[sync] All live fetches failed or disabled — using sample data');
    snapshots = sampleAprData;
  }

  try {
    await saveSnapshots(snapshots);
  } catch (e) {
    errors.push(`saveSnapshots: ${String(e)}`);
    return { success: false, source, snapshotCount: 0, errors, durationMs: Date.now() - start };
  }

  try {
    await appendHistory(snapshots.map((s) => ({ exchange: s.exchange, asset: s.asset, apr: s.apr })));
  } catch (e) {
    // history write is non-fatal
    errors.push(`appendHistory: ${String(e)}`);
  }

  // Warm the price cache for the assets we just synced so USD values load
  // instantly from DB on the My Positions page. Non-fatal.
  try {
    const assets = [...new Set(snapshots.map((s) => s.asset))];
    await getPrices(assets);
  } catch (e) {
    errors.push(`prices: ${String(e)}`);
  }

  // Evaluate alerts in the background — non-fatal
  evaluateAlerts().catch((e) => console.error('[sync] Alert evaluation failed:', e));

  return {
    success: true,
    source,
    snapshotCount: snapshots.length,
    errors,
    durationMs: Date.now() - start,
  };
}

// ─── Live fetch orchestration ─────────────────────────────────────────────────

async function fetchLiveRates(errors: string[]): Promise<SnapshotInsert[]> {
  const results = await Promise.allSettled([
    fetchPublicExchanges(errors),
    fetchAuthenticatedExchanges(errors),
  ]);

  const all: SnapshotInsert[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

/** Aave, Yearn — DeFi, no auth needed (Kraken's public API was retired) */
async function fetchPublicExchanges(errors: string[]): Promise<SnapshotInsert[]> {
  const settled = await Promise.allSettled([
    fetchAaveAprs(),
    fetchYearnAprs(),
  ]);

  const names = ['aave', 'yearn'];
  const out: SnapshotInsert[] = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') out.push(...r.value);
    else errors.push(`${names[i]}: ${String(r.reason)}`);
  });
  return out;
}

/**
 * Binance, OKX, KuCoin — need per-user API keys.
 *
 * Currently fetches using the first set of credentials stored for each exchange
 * (the platform owner's keys) to get public market rates. User-specific rate
 * personalisation is out of scope for the sync job.
 */
async function fetchAuthenticatedExchanges(errors: string[]): Promise<SnapshotInsert[]> {
  const out: SnapshotInsert[] = [];

  // ── Binance ───────────────────────────────────────────────────────────────
  if (env.BINANCE_API_KEY && env.BINANCE_API_SECRET) {
    try {
      const rows = await fetchBinanceAprs(env.BINANCE_API_KEY, env.BINANCE_API_SECRET);
      out.push(...rows);
    } catch (e) {
      errors.push(`binance: ${String(e)}`);
    }
  } else {
    errors.push('binance: API keys not configured (BINANCE_API_KEY / BINANCE_API_SECRET)');
  }

  // ── OKX ──────────────────────────────────────────────────────────────────
  if (env.OKX_API_KEY && env.OKX_API_SECRET && env.OKX_PASSPHRASE) {
    try {
      const rows = await fetchOkxAprs(env.OKX_API_KEY, env.OKX_API_SECRET, env.OKX_PASSPHRASE);
      out.push(...rows);
    } catch (e) {
      errors.push(`okx: ${String(e)}`);
    }
  } else {
    errors.push('okx: API keys not configured (OKX_API_KEY / OKX_API_SECRET / OKX_PASSPHRASE)');
  }

  // ── KuCoin ────────────────────────────────────────────────────────────────
  if (env.KUCOIN_API_KEY && env.KUCOIN_API_SECRET && env.KUCOIN_PASSPHRASE) {
    try {
      const rows = await fetchKucoinAprs(
        env.KUCOIN_API_KEY,
        env.KUCOIN_API_SECRET,
        env.KUCOIN_PASSPHRASE,
      );
      out.push(...rows);
    } catch (e) {
      errors.push(`kucoin: ${String(e)}`);
    }
  } else {
    errors.push('kucoin: API keys not configured (KUCOIN_API_KEY / KUCOIN_API_SECRET / KUCOIN_PASSPHRASE)');
  }

  return out;
}

/**
 * Fetch APRs using a specific user's stored (encrypted) exchange keys.
 * Called from the portfolio scanner — not the cron job.
 */
export async function fetchRatesForUser(userId: string): Promise<SnapshotInsert[]> {
  const keys = await findExchangeKeysByUserId(userId);
  const out: SnapshotInsert[] = [];

  for (const keyDoc of keys) {
    try {
      const apiKey = decrypt(keyDoc.apiKey);
      const apiSecret = decrypt(keyDoc.apiSecret);
      const passphrase = keyDoc.passphrase ? decrypt(keyDoc.passphrase) : undefined;

      let rows: SnapshotInsert[] = [];
      switch (keyDoc.exchange) {
        case 'binance':
          rows = await fetchBinanceAprs(apiKey, apiSecret);
          break;
        case 'okx':
          if (passphrase) rows = await fetchOkxAprs(apiKey, apiSecret, passphrase);
          break;
        case 'kucoin':
          if (passphrase) rows = await fetchKucoinAprs(apiKey, apiSecret, passphrase);
          break;
        // 'kraken' intentionally unsupported — its public rates API was retired.
      }
      out.push(...rows);
    } catch (e) {
      console.warn(`[sync] fetchRatesForUser ${keyDoc.exchange}:`, e);
    }
  }
  return out;
}
