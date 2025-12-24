import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';

export async function getUserFromRequest(req: Request) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  const db = await getMongoDb();
  if (!db) return null;

  const user = await db.collection('users').findOne({ sessionToken: token });
  if (!user) return null;
  return { user, db };
}

export function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export function dbUnavailable() {
  return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
}

