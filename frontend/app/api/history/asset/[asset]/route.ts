import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { asset: string } }) {
  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform') || undefined;
    const chain = url.searchParams.get('chain') || undefined;
    const days = url.searchParams.get('days') || '30';
    const limit = url.searchParams.get('limit') || '100';

    const db = await getDb();
    const historyCollection = db.collection('apr_history');

    const query: any = { asset: params.asset.toUpperCase() };
    if (platform) query.platform = { $regex: platform, $options: 'i' };
    if (chain) query.chain = chain.toLowerCase();

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));
    query.timestamp = { $gte: daysAgo };

    const results = await historyCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .toArray();

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('History asset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
}

