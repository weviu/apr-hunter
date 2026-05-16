import { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'session';

/**
 * 7 days in seconds — matches rolling session expiry in session.ts
 */
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Reads the raw session token from the request cookie.
 * Returns undefined if the cookie is absent.
 */
export function getSessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Builds the Set-Cookie header options for a session cookie.
 * Use with NextResponse.cookies.set() in route handlers.
 */
export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
}

/**
 * Builds the Set-Cookie options that clear the session cookie.
 */
export function clearCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/',
  };
}
