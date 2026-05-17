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

// ─── APR fetch ───────────────────────────────────────────────────────────────

export async function fetchOkxAprs(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];
  const syncedAt = new Date();

  // Flexible savings balance (live lending rates per currency held)
  try {
    const balance = await authenticatedRequest<{
      code: string;
      data?: Array<Record<string, unknown>>;
    }>('/api/v5/finance/savings/balance', apiKey, secretKey, passphrase);

    if (balance?.code === '0' && Array.isArray(balance.data)) {
      for (const item of balance.data) {
        const asset = String(item['ccy'] || '').toUpperCase();
        const raw = parseFloat(String(item['lendingRate'] || item['rate'] || '0'));
        if (!asset || isNaN(raw) || raw <= 0) continue;
        results.push({
          exchange: 'okx',
          asset,
          product: 'Flexible Earn',
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
    console.warn('[okx] Savings balance fetch failed:', e);
  }

  // Staking / DeFi product offers
  try {
    const staking = await authenticatedRequest<{
      code: string;
      data?: Array<Record<string, unknown>>;
    }>('/api/v5/finance/staking-defi/offers', apiKey, secretKey, passphrase);

    if (staking?.code === '0' && Array.isArray(staking.data)) {
      for (const offer of staking.data) {
        const asset = String(offer['ccy'] || '').toUpperCase();
        const raw = parseFloat(String(offer['apy'] || offer['rate'] || '0'));
        if (!asset || isNaN(raw) || raw <= 0) continue;

        const termRaw = offer['term'];
        const product = termRaw === '0' || termRaw === 0 ? 'Flexible Earn' : `${termRaw}-Day Staking`;

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
    console.warn('[okx] Staking offers fetch failed:', e);
  }

  return results;
}
