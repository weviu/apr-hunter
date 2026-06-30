import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { findExchangeKeysByUserId, type Exchange } from '@/repositories/exchangeKeyRepository';
import { decrypt } from '@/lib/crypto/encryption';
import { getLatestAll } from '@/repositories/aprRepository';
import { fetchBinanceHoldings } from '@/exchanges/binance';
import { fetchOkxHoldings } from '@/exchanges/okx';
import { fetchKucoinHoldings } from '@/exchanges/kucoin';
import type { ExchangeHolding } from '@/types/holdings';

export interface DetectedExchangeHolding {
  asset: string;
  exchange: string;
  amount: number;
  type: 'spot' | 'earn';
  product: string | null;
  aprCurrent: number | null;
}

/**
 * GET /api/exchanges/holdings?exchange=kucoin
 * Reads the user's real balances (spot + earn) from each connected exchange via
 * their saved keys, enriched with the current live APR for that asset.
 */
export const GET = withAuth(async (request: NextRequest, session) => {
  const { searchParams } = new URL(request.url);
  const exchangeFilter = searchParams.get('exchange') ?? undefined;

  const keys = await findExchangeKeysByUserId(session.user.id);
  const filtered = exchangeFilter ? keys.filter((k) => k.exchange === exchangeFilter) : keys;
  if (filtered.length === 0) return ok([] as DetectedExchangeHolding[]);

  // Current best APR per (exchange, asset) for enrichment.
  const snapshots = await getLatestAll();
  const aprMap = new Map<string, number>();
  for (const s of snapshots) aprMap.set(`${s.exchange}:${s.asset.toUpperCase()}`, s.apr);

  const results: DetectedExchangeHolding[] = [];

  for (const keyDoc of filtered) {
    try {
      const apiKey = decrypt(keyDoc.apiKey);
      const apiSecret = decrypt(keyDoc.apiSecret);
      const passphrase = keyDoc.passphrase ? decrypt(keyDoc.passphrase) : undefined;

      let holdings: ExchangeHolding[] = [];
      switch (keyDoc.exchange as Exchange) {
        case 'binance':
          holdings = await fetchBinanceHoldings(apiKey, apiSecret);
          break;
        case 'okx':
          if (passphrase) holdings = await fetchOkxHoldings(apiKey, apiSecret, passphrase);
          break;
        case 'kucoin':
          if (passphrase) holdings = await fetchKucoinHoldings(apiKey, apiSecret, passphrase);
          break;
      }

      for (const h of holdings) {
        results.push({
          asset: h.asset,
          exchange: keyDoc.exchange,
          amount: h.amount,
          type: h.type,
          product: h.product ?? null,
          aprCurrent: aprMap.get(`${keyDoc.exchange}:${h.asset.toUpperCase()}`) ?? null,
        });
      }
    } catch (e) {
      console.warn(`[holdings] ${keyDoc.exchange} fetch failed:`, e);
    }
  }

  // Largest holdings first.
  results.sort((a, b) => b.amount - a.amount);
  return ok(results);
});
