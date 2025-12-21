import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AprDataDocument } from '@/lib/server/models/AprData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const asset = url.searchParams.get('asset') || undefined;
    const platform = url.searchParams.get('platform') || undefined;
    const chain = url.searchParams.get('chain') || undefined;
    const platformType = url.searchParams.get('platformType') as 'exchange' | 'defi' | null;
    const minApr = url.searchParams.get('minApr') || undefined;
    const maxApr = url.searchParams.get('maxApr') || undefined;
    const sortBy = (url.searchParams.get('sortBy') as 'apr' | 'lastUpdated') || 'apr';
    const order = (url.searchParams.get('order') as 'asc' | 'desc') || 'desc';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const db = await getDb();
    const aprCollection = db.collection<AprDataDocument>('apr_data');

    const query: any = {};

    if (asset) query.asset = asset.toUpperCase();
    if (platform) query.platform = { $regex: platform, $options: 'i' };
    if (chain) query.chain = chain.toLowerCase();
    if (platformType) query.platformType = platformType;

    if (minApr || maxApr) {
      query.apr = {};
      if (minApr) query.apr.$gte = parseFloat(minApr);
      if (maxApr) query.apr.$lte = parseFloat(maxApr);
    }

    const sort: any = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    const results = await aprCollection
      .find(query)
      .sort(sort)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('APR list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch APR data' },
      { status: 500 }
    );
  }
}

