import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { findExchangeKeysByUserId, type Exchange } from '@/repositories/exchangeKeyRepository';
import { decrypt } from '@/lib/crypto/encryption';
import { getLatestAll } from '@/repositories/aprRepository';
import { fetchBinanceAprs } from '@/exchanges/binance';
import { fetchOkxAprs } from '@/exchanges/okx';
import { fetchKucoinAprs } from '@/exchanges/kucoin';

export const GET = withAuth(async (request: NextRequest, session) => {
  const { searchParams } = new URL(request.url);
  const exchangeFilter = searchParams.get('exchange') ?? undefined;

  const keys = await findExchangeKeysByUserId(session.user.id);
  const filtered = exchangeFilter
    ? keys.filter((k) => k.exchange === exchangeFilter)
    : keys;

  if (filtered.length === 0) {
    return ok([]);
  }

  // Get current APR snapshot for enrichment
  const snapshots = await getLatestAll();
  const aprMap = new Map<string, number>();
  for (const s of snapshots) {
    aprMap.set(`${s.exchange}:${s.asset.toUpperCase()}`, s.apr);
  }

  const results: { asset: string; exchange: string; amount: number | null; aprCurrent: number | null }[] = [];

  for (const keyDoc of filtered) {
    try {
      const apiKey = decrypt(keyDoc.apiKey);
      const apiSecret = decrypt(keyDoc.apiSecret);
      const passphrase = keyDoc.passphrase ? decrypt(keyDoc.passphrase) : undefined;

      let holdings: Array<{ asset: string; amount: number }> = [];

      switch (keyDoc.exchange as Exchange) {
        case 'binance': {
          const rows = await fetchBinanceAprs(apiKey, apiSecret);
          holdings = rows.map((r) => ({ asset: r.asset, amount: 0 }));
          break;
        }
        case 'okx': {
          if (passphrase) {
            const rows = await fetchOkxAprs(apiKey, apiSecret, passphrase);
            holdings = rows.map((r) => ({ asset: r.asset, amount: 0 }));
          }
          break;
        }
        case 'kucoin': {
          if (passphrase) {
            const rows = await fetchKucoinAprs(apiKey, apiSecret, passphrase);
            holdings = rows.map((r) => ({ asset: r.asset, amount: 0 }));
          }
          break;
        }
      }

      for (const h of holdings) {
        results.push({
          asset: h.asset,
          exchange: keyDoc.exchange,
          amount: h.amount,
          aprCurrent: aprMap.get(`${keyDoc.exchange}:${h.asset.toUpperCase()}`) ?? null,
        });
      }
    } catch (e) {
      console.warn(`[holdings] ${keyDoc.exchange} fetch failed:`, e);
    }
  }

  return ok(results);
});
