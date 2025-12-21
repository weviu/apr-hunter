import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AprDataDocument } from '@/lib/server/models/AprData';

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

    const results = await aprCollection
      .find(query)
      .sort({ apr: -1 })
      .limit(limit)
      .toArray();

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

