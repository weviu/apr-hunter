import { NextResponse, NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

async function resolveParams(ctx: RouteContext) {
  return 'params' in ctx && (ctx as any).params?.then ? await (ctx as any).params : (ctx as any).params;
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
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

  await db.collection('notifications').deleteOne({ _id: objectId, userId: new ObjectId(auth.user._id) });
  return NextResponse.json({ success: true });
}

