/**
 * OKX Earn adapter.
 *
 * Fetches rates from OKX Simple Savings and Staking/DeFi endpoints.
 * Uses HMAC-SHA256 signing with ISO timestamp per OKX v5 auth spec.
 *
 * APR values are returned as DECIMALS (0.05 = 5%).
 */
import crypto from 'node:crypto';
import type { SnapshotInsert } from '@/repositories/aprRepository';
import type { ExchangeHolding } from '@/types/holdings';

type HttpMethod = 'GET' | 'POST';

// ─── Signing ─────────────────────────────────────────────────────────────────

function generateSignature(
  timestamp: string,
  method: HttpMethod,
  requestPath: string,
  secretKey: string,
  body = '',
): string {
  const message = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

async function authenticatedRequest<T>(
  requestPath: string,
  apiKey: string,
  secretKey: string,
  passphrase: string,
  method: HttpMethod = 'GET',
  body?: object,
): Promise<T> {
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateSignature(timestamp, method, requestPath, secretKey, bodyStr);

  const res = await fetch(`https://www.okx.com${requestPath}`, {
    method,
    headers: {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
    },
    body: bodyStr || undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OKX API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ─── Key verification ──────────────────────────────────────────────────────────

/**
 * Verify OKX credentials with a single read-only account-balance call.
 * Throws if the credentials are rejected; resolves if they authenticate.
 *
 * OKX returns HTTP 200 with a non-"0" `code` for some auth failures, so we
 * check the body too rather than relying on the HTTP status alone.
 */
export async function verifyOkxKey(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<void> {
  const res = await authenticatedRequest<{ code: string; msg?: string }>(
    '/api/v5/account/balance',
    apiKey,
    secretKey,
    passphrase,
  );
  if (res?.code !== '0') {
    throw new Error(`OKX key verification failed: ${res?.msg || res?.code || 'unknown error'}`);
  }
}

// ─── Holdings (the user's own balances) ────────────────────────────────────────

/**
 * Read the user's OKX balances: trading account (spot) + flexible savings.
 * Best-effort; never throws.
 */
export async function fetchOkxHoldings(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<ExchangeHolding[]> {
  const out: ExchangeHolding[] = [];

  // Trading account balances (spot).
  try {
    const res = await authenticatedRequest<{
      code: string;
      data?: Array<{ details?: Array<{ ccy: string; cashBal: string; eq: string }> }>;
    }>('/api/v5/account/balance', apiKey, secretKey, passphrase);

    if (res?.code === '0' && Array.isArray(res.data)) {
      for (const acc of res.data) {
        for (const d of acc.details ?? []) {
          const asset = String(d.ccy || '').toUpperCase();
          const amt = parseFloat(d.cashBal || d.eq || '0');
          if (!asset || !(amt > 0)) continue;
          out.push({ asset, amount: amt, type: 'spot' });
        }
      }
    }
  } catch (e) {
    console.warn('[okx] account balance failed:', e);
  }

  // Flexible savings holdings.
  try {
    const res = await authenticatedRequest<{
      code: string;
      data?: Array<{ ccy: string; amt: string }>;
    }>('/api/v5/finance/savings/balance', apiKey, secretKey, passphrase);

    if (res?.code === '0' && Array.isArray(res.data)) {
      for (const d of res.data) {
        const asset = String(d.ccy || '').toUpperCase();
        const amt = parseFloat(d.amt || '0');
        if (!asset || !(amt > 0)) continue;
        out.push({ asset, amount: amt, type: 'earn', product: 'Flexible Savings' });
      }
    }
  } catch (e) {
    console.warn('[okx] savings balance failed:', e);
  }

  return out;
}

// ─── APR fetch ───────────────────────────────────────────────────────────────

/**
 * Per-endpoint failures are tolerated, but if EVERY request fails  the
 * signature of an auth/network outage  this throws so the caller can record
 * the failure instead of mistaking it for "no rates".
 */
export async function fetchOkxAprs(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];
  const syncedAt = new Date();
  const failures: string[] = [];
  const attempts = 2;

  // Flexible savings balance (live lending rates per currency held)
  try {
    const balance = await authenticatedRequest<{
      code: string;
      msg?: string;
      data?: Array<Record<string, unknown>>;
    }>('/api/v5/finance/savings/balance', apiKey, secretKey, passphrase);

    if (balance?.code !== '0' || !Array.isArray(balance.data)) {
      failures.push(`savings: ${balance?.msg || balance?.code || 'unexpected response'}`);
    } else {
      for (const item of balance.data) {
        const asset = String(item['ccy'] || '').toUpperCase();
        const raw = parseFloat(String(item['lendingRate'] || item['rate'] || '0'));
        if (!asset || isNaN(raw) || raw <= 0) continue;
        results.push({
          exchange: 'okx',
          asset,
          product: 'Flexible Savings',
          apr: raw,
          apy: raw,
          minAmount: null,
          currency: 'USD',
          source: 'live',
          syncedAt,
        });
      }
    }
  } catch (e) {
    failures.push(`savings: ${String(e)}`);
    console.warn('[okx] Savings balance fetch failed:', e);
  }

  // Staking / DeFi product offers
  try {
    const staking = await authenticatedRequest<{
      code: string;
      msg?: string;
      data?: Array<Record<string, unknown>>;
    }>('/api/v5/finance/staking-defi/offers', apiKey, secretKey, passphrase);

    if (staking?.code !== '0' || !Array.isArray(staking.data)) {
      failures.push(`staking: ${staking?.msg || staking?.code || 'unexpected response'}`);
    } else {
      for (const offer of staking.data) {
        const asset = String(offer['ccy'] || '').toUpperCase();
        const raw = parseFloat(String(offer['apy'] || offer['rate'] || '0'));
        if (!asset || isNaN(raw) || raw <= 0) continue;

        const termRaw = offer['term'];
        const product = termRaw === '0' || termRaw === 0 ? 'Staking' : `${termRaw}-Day Staking`;

        // Skip if a better rate for same asset+product already recorded
        const existing = results.findIndex(
          (r) => r.exchange === 'okx' && r.asset === asset && r.product === product,
        );
        if (existing >= 0) {
          if ((results[existing].apr ?? 0) >= raw) continue;
          results.splice(existing, 1);
        }

        results.push({
          exchange: 'okx',
          asset,
          product,
          apr: raw,
          apy: raw,
          minAmount: null,
          currency: 'USD',
          source: 'live',
          syncedAt,
        });
      }
    }
  } catch (e) {
    failures.push(`staking: ${String(e)}`);
    console.warn('[okx] Staking offers fetch failed:', e);
  }

  if (failures.length === attempts) {
    throw new Error(`OKX: all ${attempts} requests failed  ${failures.join('; ')}`);
  }

  return results;
}
