import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AprDataDocument } from '@/lib/server/models/AprData';
import { filterSampleAprData } from '@/lib/server/data/sampleAprData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const chain = url.searchParams.get('chain') || undefined;
    const platformType = url.searchParams.get('platformType') as 'exchange' | 'defi' | null;

    const db = await getDb();
    const aprCollection = db.collection<AprDataDocument>('apr_data');

    const query: any = {};
    if (chain) query.chain = chain.toLowerCase();
    if (platformType) query.platformType = platformType;

    let results = await aprCollection
      .find(query)
      .sort({ apr: -1 })
      .limit(limit)
      .toArray();

    if (results.length === 0) {
      const fallback = filterSampleAprData({
        chain,
        platformType: platformType || undefined,
        limit,
      });
      results = fallback.map((item) => ({ ...item }));
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('APR top error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch top APR opportunities' },
      { status: 500 }
    );
  }
}

