import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { AssetDocument } from '@/lib/server/models/Asset';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const db = await getDb();
    const assetCollection = db.collection<AssetDocument>('assets');

    const asset = await assetCollection.findOne({
      symbol: params.symbol.toUpperCase(),
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error('Asset detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

