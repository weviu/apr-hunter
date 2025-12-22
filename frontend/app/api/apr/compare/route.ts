import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AprDataDocument } from '@/lib/server/models/AprData';
import { filterSampleAprData } from '@/lib/server/data/sampleAprData';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { assets?: string[]; chain?: string } | null;
    const assets = body?.assets;
    const chain = body?.chain;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assets array is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const aprCollection = db.collection<AprDataDocument>('apr_data');

    const query: any = {
      asset: { $in: assets.map((a) => a.toUpperCase()) },
    };

    if (chain) {
      query.chain = chain.toLowerCase();
    }

    let results = await aprCollection
      .find(query)
      .sort({ asset: 1, apr: -1 })
      .toArray();

    if (results.length === 0) {
      const fallback = filterSampleAprData({
        assets,
        chain,
      });
      results = fallback.map((item) => ({ ...item }));
    }

    const grouped = results.reduce((acc, item) => {
      if (!acc[item.asset]) {
        acc[item.asset] = [];
      }
      acc[item.asset].push(item);
      return acc;
    }, {} as Record<string, AprDataDocument[]>);

    return NextResponse.json({
      success: true,
      data: grouped,
      count: results.length,
    });
  } catch (error) {
    console.error('APR compare error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compare APR data' },
      { status: 500 }
    );
  }
}

