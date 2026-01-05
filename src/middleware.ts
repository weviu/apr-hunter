import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Validates if a host is allowed to access the application.
 * This fixes issues with domain-based access through proxies like Cloudflare.
 */
function isHostAllowed(request: NextRequest, allowedHosts?: string): boolean {
  // Always allow if no allowedHosts configured (development mode)
  if (!allowedHosts) {
    return true;
  }

  const hosts = allowedHosts.split(',').map((h) => h.trim());
  
  // Check X-Forwarded-Host header first (set by Cloudflare/proxies)
  const forwardedHost = request.headers.get('x-forwarded-host');
  let hostToCheck = forwardedHost || request.headers.get('host') || 'unknown';
  
  // Extract hostname without port
  const hostname = hostToCheck.split(':')[0];
  
  // Check exact matches and wildcard patterns
  return hosts.some((allowed) => {
    if (allowed === hostname) return true;
    if (allowed === '*') return true;
    // Support wildcard for subdomains: *.example.com
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return hostname.endsWith('.' + domain) || hostname === domain;
    }
    return false;
  });
}

export function middleware(request: NextRequest) {
  // Log request details for debugging domain access issues
  const host = request.headers.get('host') || 'unknown';
  const xForwardedHost = request.headers.get('x-forwarded-host');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const cfRay = request.headers.get('cf-ray');
  const pathname = request.nextUrl.pathname;
  const allowedHosts = process.env.ALLOWED_HOSTS;

  // Log to help diagnose issues
  if (pathname.startsWith('/api/')) {
    console.info('[Middleware] API Request:', {
      host,
      xForwardedHost,
      pathname,
      method: request.method,
      xForwardedFor,
      xRealIp,
      cfRay,
      protocol: request.nextUrl.protocol,
      allowedHosts,
    });
  }

  // Note: Host validation is now handled at nginx level, so we don't need to check here.
  // This middleware is primarily for logging and debugging purposes.

  // Add headers to help identify the request
  const response = NextResponse.next();
  response.headers.set('X-Request-Host', host);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
