import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';

function getToken(req: Request) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

function sanitizeUser(doc: any) {
  if (!doc) return null;
  const { passwordHash, sessionToken, ...rest } = doc;
  return { ...rest, _id: doc._id?.toString?.() ?? doc._id };
}

export async function GET(req: Request) {
  try {
    const token = getToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const userDoc = await db.collection('users').findOne({ sessionToken: token });
    if (!userDoc) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: { user: sanitizeUser(userDoc) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch user' }, { status: 500 });
  }
}

