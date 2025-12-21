import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';
import { CreatePositionSchema } from '@/lib/server/models/Position';

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

    const positions = await db
      .collection('positions')
      .find({ userId, status: 'active' })
      .sort({ createdAt: -1 })
      .toArray();

    const enriched = [];
    for (const pos of positions) {
      enriched.push(await enrichPositionWithApr(db, pos));
    }

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = auth.userId;

    const body = await req.json().catch(() => null);
    const validation = CreatePositionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { platform, asset, amount, entryApr, entryPrice, notes } = validation.data;

    const aprData = await db.collection('apr_data').findOne({
      platform: { $regex: new RegExp(platform, 'i') },
      asset: { $regex: new RegExp(asset, 'i') },
    });

    const position = {
      userId,
      platform,
      asset: asset.toUpperCase(),
      amount,
      entryApr,
      currentApr: aprData?.apr || entryApr,
      entryPrice: entryPrice || null,
      currentPrice: entryPrice || null,
      status: 'active',
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('positions').insertOne(position);

    return NextResponse.json(
      {
        message: 'Position created successfully',
        position: { ...position, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating position:', error);
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
  }
}

