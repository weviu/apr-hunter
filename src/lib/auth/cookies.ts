import { NextRequest } from 'next/server';

import { env } from '@/lib/env';

const SESSION_COOKIE_NAME = 'session';

/**
 * 7 days in seconds  matches rolling session expiry in session.ts
 */
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Mark the cookie `Secure` only when the app is actually served over HTTPS.
 *
 * Tying this to NODE_ENV (production) breaks plain-http deployments: browsers
 * silently drop a `Secure` cookie over http://<non-localhost>, so login/signup
 * never persist and the dashboard bounces back to logged-out. Deriving it from
 * the configured scheme means http deploys work and https deploys stay Secure 
 * set NEXT_PUBLIC_APP_URL=https://… in production behind TLS.
 */
const COOKIE_SECURE = (env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https://');

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
    secure: COOKIE_SECURE,
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
    secure: COOKIE_SECURE,
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/',
  };
}
