import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';
import { PositionDocument } from '@/lib/server/models/Position';
import { fetchAssetPrices } from '@/lib/server/services/priceService';

export const dynamic = 'force-dynamic';

async function enrichPositionWithApr(db: any, position: any) {
  const aprData = await db.collection('apr_data').findOne({
    platform: { $regex: new RegExp(`^${position.platform}$`, 'i') },
    asset: { $regex: new RegExp(`^${position.asset}$`, 'i') },
  });

  if (aprData) {
    position.currentApr = aprData.apr;
    position.aprSource = aprData.source || aprData.platform;
    position.aprLastUpdated = aprData.lastUpdated || new Date();
  }
  return position;
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = auth.userId;

    const positionsRaw = await db
      .collection('positions')
      .find({ userId, status: 'active' })
      .toArray();

    const positions: PositionDocument[] = positionsRaw.map((pos) => ({
      ...(pos as any),
      _id: pos._id?.toString?.() ?? String(pos._id),
    }));

    const assets = Array.from(new Set(positions.map((p) => p.asset.toUpperCase())));
    const priceMap = await fetchAssetPrices(assets);

    for (const pos of positions) {
      const price = priceMap[pos.asset.toUpperCase()];
      if (price) {
        pos.currentPrice = price;
      }
    }

    for (const pos of positions) {
      await enrichPositionWithApr(db, pos);
    }

    let totalValue = 0;
    let totalEarnings = 0;

    for (const position of positions) {
      const currentPrice = position.currentPrice || position.entryPrice || 0;
      const positionValue = position.amount * currentPrice;
      totalValue += positionValue;

      const apr = position.currentApr || position.entryApr;
      const dailyRate = apr / 100 / 365;
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(position.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      totalEarnings += positionValue * dailyRate * daysSinceCreation;
    }

    return NextResponse.json({
      totalValue: Math.round(totalValue * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      positionCount: positions.length,
      positions: positions.map((p) => ({
        ...p,
        currentValue: (p.currentPrice || p.entryPrice || 0) * p.amount,
      })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

