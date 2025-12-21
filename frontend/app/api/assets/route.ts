import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AssetDocument } from '@/lib/server/models/Asset';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    const assetCollection = db.collection<AssetDocument>('assets');

    const results = await assetCollection
      .find({})
      .sort({ marketCap: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Assets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

