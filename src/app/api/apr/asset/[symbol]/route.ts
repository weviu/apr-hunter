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

    // Prefer database first (cached, fast, instant load)
    const dbData = await getLatestAprForAsset(normalizedSymbol);

    // If DB has fresh data within last 60 seconds, use it immediately
    if (dbData && dbData.length > 0) {
      const latestFetch = (dbData[0] as any)?.fetchedAt;
      if (latestFetch) {
        const ageMs = Date.now() - new Date(latestFetch).getTime();
        if (ageMs < 60000) {
          // Data is recent, use it directly
          const sorted = dbData.sort((a, b) => b.apr - a.apr);
          return NextResponse.json({
            data: sorted,
            asset: normalizedSymbol,
            source: 'cache',
          });
        }
      }
    }

    // If DB is stale or empty, fetch live data as fallback
    const live = await fetchAprBySymbol(normalizedSymbol);

    if (!live || live.length === 0) {
      // No live data, return what we have from DB
      if (dbData && dbData.length > 0) {
        const sorted = dbData.sort((a, b) => b.apr - a.apr);
        return NextResponse.json({
          data: sorted,
          asset: normalizedSymbol,
          source: 'cache-stale',
        });
      }
      return NextResponse.json({
        data: [],
        asset: normalizedSymbol,
        source: 'none',
      });
    }

    return NextResponse.json({
      data: live.sort((a, b) => b.apr - a.apr),
      asset: normalizedSymbol,
      source: 'live',
    });
  } catch (error) {
    console.error('APR asset error', error);
    
    // On error, try to return cached data
    try {
      const { symbol } = await ctx.params;
      const normalizedSymbol = symbol.toUpperCase();
      const dbData = await getLatestAprForAsset(normalizedSymbol);
      if (dbData && dbData.length > 0) {
        const sorted = dbData.sort((a, b) => b.apr - a.apr);
        return NextResponse.json({
          data: sorted,
          asset: normalizedSymbol,
          source: 'cache-fallback',
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ error: 'Unable to load asset APR data' }, { status: 500 });
  }
}
