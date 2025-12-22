import { NextRequest, NextResponse } from 'next/server';
import { fetchTopAprOpportunities } from '@/lib/exchanges/registry';
import { getTopAprOpportunities } from '@/lib/db/repositories/aprRepository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') ?? 10);

    const live = await fetchTopAprOpportunities(limit);
    const historic = await getTopAprOpportunities(limit);
    const combined = [...live, ...historic]
      .reduce<Map<string, typeof live[0]>>((acc, item) => {
        if (!item) return acc;
        const key = `${item.platform}-${item.symbol}`;
        if (!acc.has(key) || acc.get(key)!.apr < item.apr) {
          acc.set(key, item);
        }
        return acc;
      }, new Map())
      .values();

    return NextResponse.json({
      data: Array.from(combined).sort((a, b) => b.apr - a.apr).slice(0, limit),
    });
  } catch (error) {
    console.error('APR top error', error);
    return NextResponse.json({ error: 'Unable to load top opportunities' }, { status: 500 });
  }
}
