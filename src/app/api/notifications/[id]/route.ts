import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params.id);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  await db.collection('notifications').deleteOne({ _id: objectId, userId: new ObjectId(auth.user._id) });
  return NextResponse.json({ success: true });
}

