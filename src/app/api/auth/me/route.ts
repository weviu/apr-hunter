import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';

function getToken(req: Request) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

interface UserDoc {
  _id: Record<string, unknown>;
  email: string;
  passwordHash: string;
  sessionToken?: string;
  [key: string]: unknown;
}

function sanitizeUser(doc: UserDoc | null): Omit<UserDoc, 'passwordHash' | 'sessionToken'> | null {
  if (!doc) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, sessionToken: _st, ...rest } = doc;
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

    return NextResponse.json({ success: true, data: { user: sanitizeUser(userDoc as unknown as UserDoc) } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch user';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

