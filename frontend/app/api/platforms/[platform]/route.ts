import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AprDataDocument } from '@/lib/server/models/AprData';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { platform: string } }) {
  try {
    const db = await getDb();
    const aprCollection = db.collection<AprDataDocument>('apr_data');

    const results = await aprCollection
      .find({ platform: { $regex: params.platform, $options: 'i' } })
      .sort({ apr: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Platform detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch platform data' },
      { status: 500 }
    );
  }
}

