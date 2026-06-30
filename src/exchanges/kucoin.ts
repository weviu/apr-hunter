/**
 * KuCoin Earn adapter.
 *
 * Fetches savings and staking rates across v1/v3 endpoints (KuCoin's API
 * versioning is inconsistent, so we try all four paths and merge results).
 *
 * Passphrase is HMAC-signed with the API secret per KuCoin API Key v2 spec.
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
  endpoint: string,
  secretKey: string,
  body = '',
): string {
  const payload = timestamp + method + endpoint + body;
  return crypto.createHmac('sha256', secretKey).update(payload).digest('base64');
}

/**
 * KuCoin API Key v2 requires the passphrase itself to be HMAC-signed.
 * We handle the case where the stored passphrase has already been
 * base64-encoded by naively trying to decode it first.
 */
function signPassphrase(rawPassphrase: string, secretKey: string): string {
  let decoded = rawPassphrase;
  try {
    const buf = Buffer.from(rawPassphrase, 'base64');
    const text = buf.toString('utf8');
    if (text && text !== rawPassphrase && /^[\x20-\x7E]+$/.test(text)) {
      decoded = text;
    }
  } catch { /* use raw */ }
  return crypto.createHmac('sha256', secretKey).update(decoded).digest('base64');
}

async function authenticatedRequest<T>(
  endpoint: string,
  apiKey: string,
  secretKey: string,
  passphrase: string,
  method: HttpMethod = 'GET',
  body?: object,
): Promise<T> {
  const timestamp = Date.now().toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateSignature(timestamp, method, endpoint, secretKey, bodyStr);
  const signedPassphrase = signPassphrase(passphrase, secretKey);

  const res = await fetch(`https://api.kucoin.com${endpoint}`, {
    method,
    headers: {
      'KC-API-KEY': apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': signedPassphrase,
      'KC-API-KEY-VERSION': '2',
      'Content-Type': 'application/json',
    },
    body: bodyStr || undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`KuCoin API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ─── Key verification ──────────────────────────────────────────────────────────

/**
 * Verify KuCoin credentials with a single read-only accounts call.
 * Throws if the credentials are rejected; resolves if they authenticate.
 *
 * KuCoin returns HTTP 200 with a non-"200000" `code` for some auth failures,
 * so we check the body too rather than relying on the HTTP status alone.
 */
export async function verifyKucoinKey(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<void> {
  const res = await authenticatedRequest<{ code: string; msg?: string }>(
    '/api/v1/accounts',
    apiKey,
    secretKey,
    passphrase,
  );
  if (res?.code !== '200000') {
    throw new Error(`KuCoin key verification failed: ${res?.msg || res?.code || 'unknown error'}`);
  }
}

// ─── Holdings (the user's own balances) ────────────────────────────────────────

/**
 * Read the user's KuCoin balances: spot (across account types) and Earn holdings.
 * Best-effort  each source is independent, so a failure in one still returns the
 * other. Never throws.
 */
export async function fetchKucoinHoldings(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<ExchangeHolding[]> {
  const out: ExchangeHolding[] = [];

  // Spot / funding balances  /accounts returns one row per (currency, accountType).
  try {
    const res = await authenticatedRequest<{
      code: string;
      data?: Array<{ currency: string; balance: string }>;
    }>('/api/v1/accounts', apiKey, secretKey, passphrase);

    if (res?.code === '200000' && Array.isArray(res.data)) {
      const byAsset = new Map<string, number>();
      for (const a of res.data) {
        const asset = String(a.currency || '').toUpperCase();
        const amt = parseFloat(a.balance || '0');
        if (!asset || !(amt > 0)) continue;
        byAsset.set(asset, (byAsset.get(asset) ?? 0) + amt);
      }
      for (const [asset, amount] of byAsset) out.push({ asset, amount, type: 'spot' });
    }
  } catch (e) {
    console.warn('[kucoin] spot balances failed:', e);
  }

  // Earn holdings.
  try {
    const res = await authenticatedRequest<{
      code: string;
      data?: { items?: Array<{ currency: string; holdAmount: string; productCategory?: string }> };
    }>('/api/v1/earn/hold-assets?currentPage=1&pageSize=100', apiKey, secretKey, passphrase);

    if (res?.code === '200000' && Array.isArray(res.data?.items)) {
      for (const it of res.data.items) {
        const asset = String(it.currency || '').toUpperCase();
        const amt = parseFloat(it.holdAmount || '0');
        if (!asset || !(amt > 0)) continue;
        out.push({
          asset,
          amount: amt,
          type: 'earn',
          product: it.productCategory ? `${it.productCategory} Earn` : 'Earn',
        });
      }
    }
  } catch (e) {
    console.warn('[kucoin] earn holdings failed:', e);
  }

  return out;
}

// ─── APR fetch ───────────────────────────────────────────────────────────────

const APR_FIELDS = [
  'recentApy', 'latestInterestRate', 'apy', 'annualInterestRate',
  'interestRate', 'rate', 'earningRate', 'returnRate', 'yieldRate',
  'apr', 'annualRate', 'baseApy', 'floatApy',
];

const ENDPOINTS = [
  { path: '/api/v3/earn/saving/products',  type: 'savings'  },
  { path: '/api/v1/earn/saving/products',  type: 'savings'  },
  { path: '/api/v3/earn/staking/products', type: 'staking'  },
  { path: '/api/v1/earn/staking/products', type: 'staking'  },
];

/**
 * Per-endpoint failures are tolerated (KuCoin's v1/v3 paths are inconsistent),
 * but if EVERY request fails  the signature of an auth/network outage  this
 * throws so the caller can record the failure instead of mistaking it for
 * "no rates".
 */
export async function fetchKucoinAprs(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];
  const syncedAt = new Date();
  let failed = 0;

  for (const ep of ENDPOINTS) {
    try {
      const data = await authenticatedRequest<{
        code: string;
        data?: unknown;
      }>(ep.path, apiKey, secretKey, passphrase);

      if (data?.code !== '200000' || !data.data) {
        failed++;
        continue;
      }

      const items = Array.isArray(data.data)
        ? (data.data as Record<string, unknown>[])
        : Array.isArray((data.data as Record<string, unknown>)['items'])
        ? ((data.data as Record<string, unknown>)['items'] as Record<string, unknown>[])
        : [];

      for (const item of items) {
        const asset = String(item['currency'] || item['coin'] || item['ccy'] || '').toUpperCase();
        if (!asset) continue;

        let apr = 0;
        for (const field of APR_FIELDS) {
          if (item[field] == null) continue;
          const val = typeof item[field] === 'string'
            ? (item[field] as string).replace('%', '')
            : item[field];
          const parsed = parseFloat(String(val));
          if (!isNaN(parsed) && parsed > 0) {
            apr = parsed;
            break;
          }
        }
        // Normalise to decimal: KuCoin sometimes returns 5.0 meaning 5%
        if (apr > 1) apr = apr / 100;
        if (apr <= 0 || apr > 10) continue; // sanity cap at 1000%

        const lockRaw = item['lockDay'] || item['duration'] || item['period'] || item['term'];
        const product = lockRaw ? `${lockRaw}-Day ${ep.type === 'staking' ? 'Staking' : 'Savings'}` : 'Flexible';

        // Keep the best rate per (asset, product)
        const existing = results.findIndex(
          (r) => r.exchange === 'kucoin' && r.asset === asset && r.product === product,
        );
        if (existing >= 0) {
          if ((results[existing].apr ?? 0) >= apr) continue;
          results.splice(existing, 1);
        }

        results.push({
          exchange: 'kucoin',
          asset,
          product,
          apr,
          apy: apr,
          minAmount: parseFloat(String(item['minDepositAmount'] || item['minStakeAmount'] || item['minAmount'] || '0')),
          currency: 'USD',
          source: 'live',
          syncedAt,
        });
      }
    } catch (e) {
      failed++;
      console.warn(`[kucoin] ${ep.path} failed:`, e);
    }
  }

  if (failed === ENDPOINTS.length) {
    throw new Error(`KuCoin: all ${ENDPOINTS.length} earn requests failed (likely auth or network error)`);
  }

  return results;
}
