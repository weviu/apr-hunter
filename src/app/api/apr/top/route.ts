import { NextRequest, NextResponse } from 'next/server';
import { fetchTopAprOpportunities } from '@/lib/exchanges/registry';
import { getTopAprOpportunities } from '@/lib/db/repositories/aprRepository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') ?? 10);

    // Prefer database first (cached, fast)
    const dbData = await getTopAprOpportunities(limit);
    
    // If DB has fresh data within last 60 seconds, use it immediately
    if (dbData && dbData.length > 0) {
      const latestFetch = (dbData[0] as any)?.fetchedAt;
      if (latestFetch) {
        const ageMs = Date.now() - new Date(latestFetch).getTime();
        if (ageMs < 60000) {
          // Data is recent, use it directly
          return NextResponse.json({
            data: dbData,
            source: 'cache',
          });
        }
      }
    }

    // If DB is stale or empty, fetch live data as fallback
    const live = await fetchTopAprOpportunities(limit);
    
    if (!live || live.length === 0) {
      // No live data, return what we have from DB
      if (dbData && dbData.length > 0) {
        return NextResponse.json({
          data: dbData,
          source: 'cache-stale',
        });
      }
      return NextResponse.json({
        data: [],
        source: 'none',
      });
    }

    return NextResponse.json({
      data: live,
      source: 'live',
    });
  } catch (error) {
    console.error('APR top error', error);
    
    // On error, try to return cached data
    try {
      const dbData = await getTopAprOpportunities(Number(new URL(request.url).searchParams.get('limit') ?? 10));
      if (dbData && dbData.length > 0) {
        return NextResponse.json({
          data: dbData,
          source: 'cache-fallback',
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ error: 'Unable to load top opportunities' }, { status: 500 });
  }
}
