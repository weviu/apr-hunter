import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AprDataDocument } from '@/lib/server/models/AprData';
import { filterSampleAprData } from '@/lib/server/data/sampleAprData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { asset: string } }) {
  try {
    const url = new URL(req.url);
    const includeHistory = url.searchParams.get('includeHistory') === 'true';

    const db = await getDb();
    const aprCollection = db.collection<AprDataDocument>('apr_data');

    let results = await aprCollection
      .find({ asset: params.asset.toUpperCase() })
      .sort({ apr: -1 })
      .toArray();

    if (results.length === 0) {
      results = filterSampleAprData({ assets: [params.asset.toUpperCase()] }).map((item) => ({ ...item }));
    }

    let history: any = null;
    if (includeHistory) {
      const historyCollection = db.collection('apr_history');
      const historyData = await historyCollection
        .find({ asset: params.asset.toUpperCase() })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
      history = historyData;
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      ...(history && { history }),
    });
  } catch (error) {
    console.error('APR asset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch APR data for asset' },
      { status: 500 }
    );
  }
}

