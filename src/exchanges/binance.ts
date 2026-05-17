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

// ─── APR fetch ───────────────────────────────────────────────────────────────

/** Fetch current APR rates from Binance Simple Earn (flexible + locked). */
export async function fetchBinanceAprs(apiKey: string, secretKey: string): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];
  const syncedAt = new Date();

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

    if (Array.isArray(flexible?.rows)) {
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

    if (Array.isArray(locked?.rows)) {
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
    console.warn('[binance] Locked earn fetch failed:', e);
  }

  return results;
}
