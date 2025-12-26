import { NextResponse } from 'next/server';
import { fetchAllAprOpportunities } from '@/lib/exchanges/registry';

function getMeta(opportunities: Awaited<ReturnType<typeof fetchAllAprOpportunities>>) {
  const exchanges = Array.from(new Set(opportunities.map((item) => item.platform)));
  const assets = Array.from(new Set(opportunities.map((item) => item.symbol)));
  const staleSources = opportunities
    .filter((item) => Date.now() - new Date(item.lastUpdated).getTime() > 60 * 60 * 1000)
    .map((item) => item.platform);

  return {
    exchanges,
    assets,
    staleSources: Array.from(new Set(staleSources)),
  };
}

export async function GET() {
  try {
    const data = await fetchAllAprOpportunities();

    return NextResponse.json({
      data,
      fetchedAt: new Date().toISOString(),
      meta: getMeta(data),
    });
  } catch (error) {
    console.error('APR aggregation error', error);
    return NextResponse.json(
      {
        error: 'Unable to fetch APR data at this time.',
      },
      { status: 500 },
    );
  }
}
