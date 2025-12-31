import { NextRequest, NextResponse } from 'next/server';
import { fetchTopAprOpportunities } from '@/lib/exchanges/registry';
import { getTopAprOpportunities } from '@/lib/db/repositories/aprRepository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') ?? 10);

    const live = await fetchTopAprOpportunities(limit);
    const historic = await getTopAprOpportunities(limit);

    const liveKeys = new Set(live.map((item) => `${item.platform}-${item.symbol}`));
    const filteredHistoric = historic.filter((item) => liveKeys.has(`${item.platform}-${item.symbol}`));

    const combined = [...live, ...filteredHistoric].reduce<Map<string, Record<string, unknown>>>((acc, item) => {
      if (!item) return acc;
      const key = `${item.platform}-${item.symbol}`;
      // prefer freshest, then highest apr
      const existing = acc.get(key);
      const existingRec = existing as unknown as Record<string, unknown>;
      const itemRec = item as unknown as Record<string, unknown>;
      const existingFetched = existingRec?.fetchedAt;
      const itemFetched = itemRec?.fetchedAt;
      const existingApr = Number(existingRec?.apr || 0);
      const itemApr = Number(itemRec?.apr || 0);
      if (
        !existing ||
        new Date(String(existingRec.lastUpdated || existingFetched || 0)) < new Date(String(itemRec.lastUpdated || itemFetched || 0)) ||
        (existingRec.lastUpdated === itemRec.lastUpdated && existingApr < itemApr)
      ) {
        acc.set(key, {
          ...(item as unknown as Record<string, unknown>),
          lastUpdated: itemRec.lastUpdated || itemFetched || new Date().toISOString(),
        });
      }
      return acc;
    }, new Map());

    const sorted = Array.from(combined.values()).sort((a, b) => Number(b.apr || 0) - Number(a.apr || 0)).slice(0, limit);

    return NextResponse.json({
      data: sorted,
    });
  } catch (error) {
    console.error('APR top error', error);
    return NextResponse.json({ error: 'Unable to load top opportunities' }, { status: 500 });
  }
}
