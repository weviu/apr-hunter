import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/alerts/[id]'>) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const body = await req.json().catch(() => null);
  const { isActive } = body || {};

  const params = await ctx.params;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params?.id);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  await db
    .collection('alerts')
    .updateOne({ _id: objectId, userId: new ObjectId(auth.user._id) }, { $set: { isActive: !!isActive, updatedAt: new Date().toISOString() } });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/alerts/[id]'>) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const params = await ctx.params;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params?.id);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  await db.collection('alerts').deleteOne({ _id: objectId, userId: new ObjectId(auth.user._id) });
  return NextResponse.json({ success: true });
}

