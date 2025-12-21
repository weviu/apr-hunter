import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AprDataDocument } from '@/lib/server/models/AprData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform') || undefined;

    const db = await getDb();
    const aprCollection = db.collection<AprDataDocument>('apr_data');

    const filter: any = {};
    if (platform) {
      filter.platform = { $regex: platform, $options: 'i' };
    }

    const assets = await aprCollection.distinct('asset', filter);

    return NextResponse.json({
      success: true,
      data: assets.map((a) => ({ symbol: a })),
      count: assets.length,
    });
  } catch (error) {
    console.error('APR assets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset list' },
      { status: 500 }
    );
  }
}

