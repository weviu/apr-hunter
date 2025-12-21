import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AprDataDocument } from '@/lib/server/models/AprData';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    const aprCollection = db.collection<AprDataDocument>('apr_data');

    const platforms = await aprCollection.distinct('platform');
    const platformTypes = await aprCollection.distinct('platformType');

    const platformStats = await aprCollection.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          avgApr: { $avg: '$apr' },
          maxApr: { $max: '$apr' },
          minApr: { $min: '$apr' },
          platformType: { $first: '$platformType' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: {
        platforms,
        platformTypes,
        statistics: platformStats,
      },
    });
  } catch (error) {
    console.error('Platforms error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}

