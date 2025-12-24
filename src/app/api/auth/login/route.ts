import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';

type LoginBody = {
  email?: string;
  password?: string;
};

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
}

function sanitizeUser(doc: any) {
  if (!doc) return null;
  const { passwordHash, sessionToken, ...rest } = doc;
  return { ...rest, _id: doc._id?.toString?.() ?? doc._id };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const users = db.collection('users');
    const userDoc = await users.findOne({ email });
    if (!userDoc || !userDoc.passwordHash) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = verifyPassword(password, userDoc.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionToken = crypto.randomUUID();
    await users.updateOne({ _id: userDoc._id }, { $set: { sessionToken, updatedAt: new Date().toISOString() } });

    const user = sanitizeUser(userDoc);
    return NextResponse.json({ success: true, data: { user, token: sessionToken } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Login failed' }, { status: 500 });
  }
}

