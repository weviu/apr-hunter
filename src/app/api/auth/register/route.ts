import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';

type RegisterBody = {
  email?: string;
  password?: string;
  name?: string;
};

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
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
  return {
    ...rest,
    _id: doc._id?.toString?.() ?? doc._id,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const name = body.name?.trim();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const users = db.collection('users');
    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const sessionToken = crypto.randomUUID();
    const now = new Date().toISOString();

    const doc = {
      email,
      name: name || undefined,
      passwordHash,
      sessionToken,
      createdAt: now,
      updatedAt: now,
    };

    const insert = await users.insertOne(doc);
    const user = sanitizeUser({ ...doc, _id: insert.insertedId } as unknown as UserDoc);

    return NextResponse.json({ success: true, data: { user, token: sessionToken } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

