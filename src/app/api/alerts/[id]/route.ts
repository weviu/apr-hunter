import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

async function resolveParams(ctx: RouteContext) {
  // Next can provide params as a Promise in app router; unwrap if needed.
  return 'params' in ctx && (ctx as any).params?.then ? await (ctx as any).params : (ctx as any).params;
}

export async function PUT(req: Request, ctx: RouteContext) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const body = await req.json().catch(() => null);
  const { isActive } = body || {};

  const params = await resolveParams(ctx);

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

export async function DELETE(req: Request, ctx: RouteContext) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const params = await resolveParams(ctx);

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params?.id);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  await db.collection('alerts').deleteOne({ _id: objectId, userId: new ObjectId(auth.user._id) });
  return NextResponse.json({ success: true });
}

