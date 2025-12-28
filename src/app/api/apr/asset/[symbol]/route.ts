import { NextRequest, NextResponse } from 'next/server';
import { fetchAprBySymbol } from '@/lib/exchanges/registry';
import { getLatestAprForAsset } from '@/lib/db/repositories/aprRepository';

export async function GET(request: NextRequest, ctx: RouteContext<'/api/apr/asset/[symbol]'>) {
  try {
    const { symbol } = await ctx.params;
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const normalizedSymbol = symbol.toUpperCase();
    const live = await fetchAprBySymbol(normalizedSymbol);
    const historic = await getLatestAprForAsset(normalizedSymbol);
    const merged = [...live, ...historic];

    const deduped = Array.from(
      merged.reduce<Map<string, (typeof merged)[number]>>((acc, item) => {
        const key = `${item.platform}-${item.symbol}-${item.lockPeriod ?? 'flex'}`;
        if (!acc.has(key) || new Date(acc.get(key)!.lastUpdated) < new Date(item.lastUpdated)) {
          acc.set(key, item);
        }
        return acc;
      }, new Map()).values(),
    ).sort((a, b) => b.apr - a.apr);

    return NextResponse.json({
      data: deduped,
      asset: normalizedSymbol,
    });
  } catch (error) {
    console.error('APR asset error', error);
    return NextResponse.json({ error: 'Unable to load asset APR data' }, { status: 500 });
  }
}
