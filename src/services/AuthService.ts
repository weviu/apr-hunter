import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
} from '@/repositories/userRepository';
import {
  createSession,
  findSessionByTokenHash,
  deleteSession,
  deleteAllUserSessions,
} from '@/repositories/sessionRepository';

const BCRYPT_COST = 12;
const SESSION_DAYS = 7;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function sessionExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Return types ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginResult {
  user: AuthUser;
  token: string; // raw session token — set in httpOnly cookie
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type RegisterError = 'EMAIL_TAKEN' | 'DB_ERROR';

/**
 * Create a new user account.
 * Returns the new user on success, or throws with a typed error code.
 */
export async function register(
  email: string,
  password: string,
  name: string,
): Promise<AuthUser> {
  const existing = await findUserByEmail(email);
  if (existing) {
    const e = new Error('Email already in use');
    (e as Error & { code: RegisterError }).code = 'EMAIL_TAKEN';
    throw e;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const id = await createUser({ email, passwordHash, name });
  return { id, email: email.toLowerCase().trim(), name };
}

/**
 * Verify credentials and issue a new session token.
 * Returns null if credentials are wrong.
 */
export async function login(
  email: string,
  password: string,
  userAgent?: string,
): Promise<LoginResult | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;

  const token = generateToken();
  await createSession({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: sessionExpiry(),
    userAgent,
  });

  return {
    user: { id: user._id.toHexString(), email: user.email, name: user.name },
    token,
  };
}

/** Delete the specific session identified by the raw token. */
export async function logout(rawToken: string): Promise<void> {
  const session = await findSessionByTokenHash(hashToken(rawToken));
  if (session) {
    await deleteSession(session._id);
  }
}

/** Delete ALL sessions for a user (e.g. on password change). */
export async function logoutAll(userId: string): Promise<void> {
  await deleteAllUserSessions(userId);
}

/** Return the authenticated user for a given raw session token, or null. */
export async function me(rawToken: string): Promise<AuthUser | null> {
  const session = await findSessionByTokenHash(hashToken(rawToken));
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user) return null;

  return { id: user._id.toHexString(), email: user.email, name: user.name };
}

/** Change password — re-hashes and invalidates all existing sessions. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user) return false;

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return false;

  const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await updateUserPassword(userId, newHash);
  await deleteAllUserSessions(userId);
  return true;
}
