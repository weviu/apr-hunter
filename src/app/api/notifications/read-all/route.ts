import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';

export async function PUT(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  await db
    .collection('notifications')
    .updateMany({ userId: new ObjectId(auth.user._id), read: { $ne: true } }, { $set: { read: true, updatedAt: new Date().toISOString() } });

  return NextResponse.json({ success: true });
}

