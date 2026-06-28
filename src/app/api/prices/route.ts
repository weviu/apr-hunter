import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { getPrices } from '@/lib/prices/coin-gecko';

/**
 * GET /api/prices?symbols=ETH,USDC,DAI
 * Returns { "ETH": 3241.1, "USDC": 1.0, ... } in USD.
 * Backed by the 60s Mongo price cache (kept warm by the sync job). Symbols with
 * no known price are simply omitted — the UI shows "—" rather than $0.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbols') ?? '';
  const symbols = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) return ok({});

  const prices = await getPrices(symbols);
  return ok(prices);
}
