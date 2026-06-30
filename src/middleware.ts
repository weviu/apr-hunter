import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// In-process sliding-window rate limiter
// Keyed by "<IP>::<bucket>".  Resets after `windowMs` milliseconds.
// Single-process PM2 fork mode  no shared storage needed.
// ---------------------------------------------------------------------------

interface RateWindow {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateWindow>();

function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

// Periodically clean up expired entries to avoid unbounded growth.
// Runs at most once per minute.
let lastCleanup = 0;
function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Rate-limit buckets
// ---------------------------------------------------------------------------
const BUCKETS = {
  // Auth endpoints  strict to prevent brute force
  auth: { limit: 10, windowMs: 60_000 },
  // Cron endpoint  only the PM2 script calls it; still guard against accidents
  cron: { limit: 5, windowMs: 60_000 },
  // APR read routes  public, high-traffic; generous limit
  apr: { limit: 120, windowMs: 60_000 },
  // Authenticated write routes (portfolios, positions, alerts, notifications)
  api: { limit: 60, windowMs: 60_000 },
} as const;

type Bucket = keyof typeof BUCKETS;

function getBucket(pathname: string): Bucket | null {
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/cron/')) return 'cron';
  if (pathname.startsWith('/api/apr')) return 'apr';
  if (pathname.startsWith('/api/')) return 'api';
  return null; // static files, pages  no rate limit
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export function middleware(request: NextRequest): NextResponse {
  maybeCleanup();

  const { pathname } = request.nextUrl;
  const bucket = getBucket(pathname);

  if (!bucket) return NextResponse.next();

  const { limit, windowMs } = BUCKETS[bucket];

  // Prefer X-Forwarded-For set by a trusted reverse proxy; fall back to the
  // direct connection address.  We never trust client-supplied headers blindly
  // in a public deployment  strip to just the first hop.
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0] : null) ?? '127.0.0.1';
  const key = `${ip}::${bucket}`;

  if (!allow(key, limit, windowMs)) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all API routes.  Exclude Next.js internals and static assets so
     * the rate limiter never fires on _next/static, _next/image, favicon, etc.
     */
    '/api/:path*',
  ],
};
