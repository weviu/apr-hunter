/**
 * Binance Simple Earn adapter.
 *
 * Fetches flexible and locked earn rates from the Binance API.
 * Falls back to an empty array on auth failure — the caller (AprSyncJob)
 * decides whether to substitute sample data.
 *
 * APR values are returned as DECIMALS (0.05 = 5%).
 */
import crypto from 'node:crypto';
import type { SnapshotInsert } from '@/repositories/aprRepository';
import type { ExchangeHolding } from '@/types/holdings';

// ─── Signing ─────────────────────────────────────────────────────────────────

function generateSignature(queryString: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
}

async function authenticatedRequest<T>(
  endpoint: string,
  params: Record<string, string>,
  apiKey: string,
  secretKey: string,
): Promise<T> {
  const timestamp = Date.now().toString();
  const queryParams = new URLSearchParams({ ...params, timestamp });
  const signature = generateSignature(queryParams.toString(), secretKey);
  queryParams.append('signature', signature);

  const res = await fetch(`https://api.binance.com${endpoint}?${queryParams.toString()}`, {
    method: 'GET',
    headers: { 'X-MBX-APIKEY': apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Binance API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Key verification ──────────────────────────────────────────────────────────

/**
 * Verify Binance credentials with a single read-only account call.
 * Throws if the credentials are rejected; resolves if they authenticate.
 *
 * Uses GET /api/v3/account — the standard signed account-info endpoint, which
 * only needs the always-on "Enable Reading" permission that every key (incl.
 * Simple-Earn-only keys) has. Unlike fetchBinanceAprs, this does NOT swallow
 * errors — it is used to prove the keys actually work.
 */
export async function verifyBinanceKey(apiKey: string, secretKey: string): Promise<void> {
  await authenticatedRequest('/api/v3/account', {}, apiKey, secretKey);
}

// ─── Holdings (the user's own balances) ────────────────────────────────────────

/**
 * Read the user's Binance balances: spot account + flexible Simple Earn positions.
 * Best-effort; never throws.
 */
export async function fetchBinanceHoldings(
  apiKey: string,
  secretKey: string,
): Promise<ExchangeHolding[]> {
  const out: ExchangeHolding[] = [];

  // Spot balances.
  try {
    const res = await authenticatedRequest<{
      balances?: Array<{ asset: string; free: string; locked: string }>;
    }>('/api/v3/account', {}, apiKey, secretKey);

    if (Array.isArray(res?.balances)) {
      for (const b of res.balances) {
        const asset = String(b.asset || '').toUpperCase();
        const amt = parseFloat(b.free || '0') + parseFloat(b.locked || '0');
        if (!asset || !(amt > 0)) continue;
        out.push({ asset, amount: amt, type: 'spot' });
      }
    }
  } catch (e) {
    console.warn('[binance] spot balances failed:', e);
  }

  // Flexible Simple Earn positions.
  try {
    const res = await authenticatedRequest<{
      rows?: Array<{ asset: string; totalAmount: string }>;
    }>('/sapi/v1/simple-earn/flexible/position', { size: '100' }, apiKey, secretKey);

    if (Array.isArray(res?.rows)) {
      for (const r of res.rows) {
        const asset = String(r.asset || '').toUpperCase();
        const amt = parseFloat(r.totalAmount || '0');
        if (!asset || !(amt > 0)) continue;
        out.push({ asset, amount: amt, type: 'earn', product: 'Flexible Savings' });
      }
    }
  } catch (e) {
    console.warn('[binance] flexible earn positions failed:', e);
  }

  return out;
}

// ─── APR fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch current APR rates from Binance Simple Earn (flexible + locked).
 *
 * Per-endpoint failures are tolerated (a partial result is still useful), but
 * if EVERY request fails — the signature of an auth/network outage — this throws
 * so the caller can record the failure instead of mistaking it for "no rates".
 */
export async function fetchBinanceAprs(apiKey: string, secretKey: string): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];
  const syncedAt = new Date();
  const failures: string[] = [];
  const attempts = 2;

  // Flexible Simple Earn
  try {
    const flexible = await authenticatedRequest<{
      rows: {
        asset: string;
        latestAnnualPercentageRate?: string;
        avgAnnualPercentageRate?: string;
        minPurchaseAmount?: string;
      }[];
    }>('/sapi/v1/simple-earn/flexible/list', { size: '100' }, apiKey, secretKey);

    if (!Array.isArray(flexible?.rows)) {
      failures.push('flexible: unexpected response shape');
    } else {
      for (const product of flexible.rows) {
        const asset = String(product.asset || '').toUpperCase();
        if (!asset) continue;

        const raw = parseFloat(String(product.latestAnnualPercentageRate || product.avgAnnualPercentageRate || '0'));
        if (isNaN(raw) || raw <= 0) continue;

        // Binance returns rates as decimals (0.05 = 5%)
        results.push({
          exchange: 'binance',
          asset,
          product: 'Flexible Savings',
          apr: raw,
          apy: raw,
          minAmount: parseFloat(product.minPurchaseAmount || '0'),
          currency: 'USD',
          source: 'live',
          syncedAt,
        });
      }
    }
  } catch (e) {
    failures.push(`flexible: ${String(e)}`);
    console.warn('[binance] Flexible earn fetch failed:', e);
  }

  // Locked Simple Earn
  try {
    const locked = await authenticatedRequest<{
      rows: {
        asset: string;
        duration?: number;
        minPurchaseAmount?: string;
        apy?: string;
        detail?: { apy?: string; annualPercentageRate?: string }[];
      }[];
    }>('/sapi/v1/simple-earn/locked/list', { size: '100' }, apiKey, secretKey);

    if (!Array.isArray(locked?.rows)) {
      failures.push('locked: unexpected response shape');
    } else {
      for (const product of locked.rows) {
        const asset = String(product.asset || '').toUpperCase();
        if (!asset) continue;

        let apr = 0;
        if (Array.isArray(product.detail)) {
          for (const tier of product.detail) {
            const v = parseFloat(tier.apy || tier.annualPercentageRate || '0');
            if (!isNaN(v) && v > apr) apr = v;
          }
        }
        if (apr <= 0) {
          const fallback = parseFloat(product.apy || '0');
          if (!isNaN(fallback)) apr = fallback;
        }
        if (apr <= 0) continue;

        const lockLabel = typeof product.duration === 'number' ? `${product.duration}-Day Locked` : 'Locked';
        results.push({
          exchange: 'binance',
          asset,
          product: lockLabel,
          apr,
          apy: apr,
          minAmount: parseFloat(product.minPurchaseAmount || '0'),
          currency: 'USD',
          source: 'live',
          syncedAt,
        });
      }
    }
  } catch (e) {
    failures.push(`locked: ${String(e)}`);
    console.warn('[binance] Locked earn fetch failed:', e);
  }

  if (failures.length === attempts) {
    throw new Error(`Binance: all ${attempts} requests failed — ${failures.join('; ')}`);
  }

  return results;
}
