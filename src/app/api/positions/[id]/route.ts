import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/positions/[id]'>) {
  const auth = await getUserFromRequest(_req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const params = await ctx.params;
  const id = params?.id;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  const authUserIdStr = String((auth.user as Record<string, unknown>)._id ?? '');

  const doc = await db.collection('positions').findOne({ _id: objectId });
  if (!doc) {
    return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
  }

  const docUserIdStr = String((doc as Record<string, unknown>).userId ?? '');
  if (docUserIdStr !== authUserIdStr) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const updateResult = await db.collection('positions').updateOne(
    { _id: objectId },
    { $set: { status: 'closed', closedAt: nowIso, updatedAt: nowIso } }
  );

  if (!updateResult.matchedCount) {
    return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

