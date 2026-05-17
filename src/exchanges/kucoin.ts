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

export async function fetchKucoinAprs(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];
  const syncedAt = new Date();

  for (const ep of ENDPOINTS) {
    try {
      const data = await authenticatedRequest<{
        code: string;
        data?: unknown;
      }>(ep.path, apiKey, secretKey, passphrase);

      if (data?.code !== '200000' || !data.data) continue;

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
      console.warn(`[kucoin] ${ep.path} failed:`, e);
    }
  }

  return results;
}
