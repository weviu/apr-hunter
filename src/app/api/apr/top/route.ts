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
    const filteredHistoric = historic.filter((item: any) => liveKeys.has(`${item.platform}-${item.symbol}`));

    const combined = [...live, ...filteredHistoric].reduce<Map<string, any>>((acc, item) => {
      if (!item) return acc;
      const key = `${item.platform}-${item.symbol}`;
      // prefer freshest, then highest apr
      const existing = acc.get(key);
      const existingFetched = (existing as any)?.fetchedAt;
      const itemFetched = (item as any)?.fetchedAt;
      if (
        !existing ||
        new Date(existing.lastUpdated || existingFetched || 0) < new Date(item.lastUpdated || itemFetched || 0) ||
        (existing.lastUpdated === item.lastUpdated && existing.apr < item.apr)
      ) {
        acc.set(key, {
          ...item,
          lastUpdated: item.lastUpdated || itemFetched || new Date().toISOString(),
        });
      }
      return acc;
    }, new Map());

    const sorted = Array.from(combined.values()).sort((a, b) => b.apr - a.apr).slice(0, limit);

    return NextResponse.json({
      data: sorted,
    });
  } catch (error) {
    console.error('APR top error', error);
    return NextResponse.json({ error: 'Unable to load top opportunities' }, { status: 500 });
  }
}
