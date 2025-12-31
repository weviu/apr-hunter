import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';
import { fetchAprBySymbol } from '@/lib/exchanges/registry';

async function enrichPositionWithApr(db: any, position: Record<string, unknown>) {
  // Try live APR first
  try {
    const asset = typeof position.asset === 'string' ? position.asset : '';
    const liveBySymbol = await fetchAprBySymbol(asset);
    const liveMatch = liveBySymbol.find(
      (item) => item.platform?.toLowerCase() === String(position.platform || '').toLowerCase()
    );
    if (liveMatch?.apr !== undefined) {
      position.currentApr = liveMatch.apr;
      position.aprSource = liveMatch.platform || position.platform;
      position.aprLastUpdated = liveMatch.lastUpdated || new Date().toISOString();
      return position;
    }
  } catch {
    // fallback to db
  }

  const aprData = await (db as any).collection('apr_data').findOne({
    platform: { $regex: new RegExp(`^${String(position.platform || '')}$`, 'i') },
    asset: { $regex: new RegExp(`^${String(position.asset || '')}$`, 'i') },
  });

  if (aprData) {
    position.currentApr = aprData.apr;
    position.aprSource = aprData.source || aprData.platform || position.platform;
    position.aprLastUpdated = aprData.lastUpdated || new Date().toISOString();
  }
  return position;
}

export async function GET(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const positions = await db
    .collection('positions')
    .find({ userId: new ObjectId(auth.user._id), status: 'active' })
    .sort({ createdAt: -1 })
    .toArray();

  const enriched = [];
  for (const pos of positions) {
    const normalized = {
      ...pos,
      _id: pos._id?.toString?.() ?? String(pos._id),
      asset: String(pos.asset).toUpperCase(),
      currentApr: typeof pos.currentApr === 'number' ? pos.currentApr : pos.entryApr,
      aprSource: pos.aprSource || pos.platform,
      aprLastUpdated: pos.aprLastUpdated || pos.updatedAt || pos.createdAt,
    };
    enriched.push(await enrichPositionWithApr(db, normalized));
  }

  return NextResponse.json({ success: true, data: enriched });
}

export async function POST(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const body = await req.json().catch(() => null);
  const { platform, asset, amount, entryApr, entryPrice, notes } = body || {};

  if (!platform || !asset || amount === undefined || entryApr === undefined) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  const upperAsset = String(asset).toUpperCase();

  const aprData = await db.collection('apr_data').findOne({
    platform: { $regex: new RegExp(`^${platform}$`, 'i') },
    asset: { $regex: new RegExp(`^${upperAsset}$`, 'i') },
  });

  const nowIso = new Date().toISOString();

  const doc = {
    userId: new ObjectId(auth.user._id),
    platform,
    asset: upperAsset,
    amount: Number(amount),
    entryApr: Number(entryApr),
    currentApr: typeof aprData?.apr === 'number' ? aprData.apr : Number(entryApr),
    entryPrice: entryPrice !== undefined ? Number(entryPrice) : null,
    currentPrice: entryPrice !== undefined ? Number(entryPrice) : null,
    status: 'active',
    notes: notes || null,
    aprSource: aprData?.source || aprData?.platform || platform,
    aprLastUpdated: aprData?.lastUpdated || nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const res = await db.collection('positions').insertOne(doc);

  return NextResponse.json(
    {
      success: true,
      data: { ...doc, _id: res.insertedId.toString() },
    },
    { status: 201 }
  );
}

