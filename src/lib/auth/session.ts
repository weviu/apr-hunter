import crypto from 'node:crypto';

import { ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';

import { getMongoDb } from '@/lib/db/mongodb';
import { getSessionToken } from '@/lib/auth/cookies';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface ResolvedSession {
  user: SessionUser;
  sessionId: string;
}

/**
 * Resolves an authenticated session from the request cookie.
 *
 * - Reads the raw token from the httpOnly cookie
 * - Hashes it (SHA-256) and looks it up in the sessions collection
 * - Verifies expiry
 * - Extends expiry by 7 days (rolling session)
 * - Returns { user, sessionId } or null if unauthenticated
 */
export async function resolveSession(
  request: NextRequest,
): Promise<ResolvedSession | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const db = await getMongoDb();
  if (!db) return null;

  const session = await db.collection('sessions').findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });

  if (!session) return null;

  const user = await db
    .collection('users')
    .findOne(
      { _id: session.userId },
      { projection: { _id: 1, email: 1, name: 1 } },
    );

  if (!user) return null;

  // Rolling expiry: extend session on every authenticated request
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db
    .collection('sessions')
    .updateOne({ _id: session._id }, { $set: { expiresAt: newExpiry } });

  return {
    user: {
      id: (user._id as ObjectId).toHexString(),
      email: user.email as string,
      name: user.name as string,
    },
    sessionId: (session._id as ObjectId).toHexString(),
  };
}
