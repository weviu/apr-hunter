import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';

export async function GET(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const alerts = await db
    .collection('alerts')
    .find({ userId: new ObjectId(auth.user._id) })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ success: true, alerts: alerts.map((a: Record<string, unknown>) => ({ ...a, id: (a._id as { toString(): string }).toString() })) });
}

export async function POST(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const body = await req.json().catch(() => null);
  const { asset, platform, alertType, threshold } = body || {};
  if (!asset || !platform || !alertType || threshold === undefined) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  const doc = {
    userId: new ObjectId(auth.user._id),
    asset: String(asset).toUpperCase(),
    platform,
    alertType: alertType === 'below' ? 'below' : 'above',
    threshold: Number(threshold),
    isActive: true,
    createdAt: new Date().toISOString(),
    lastTriggered: null as string | null,
  };

  const res = await db.collection('alerts').insertOne(doc);
  return NextResponse.json({ success: true, data: { id: res.insertedId.toString() } });
}

