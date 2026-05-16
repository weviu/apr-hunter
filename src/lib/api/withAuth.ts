import { NextRequest } from 'next/server';

import { err } from '@/lib/api/response';
import { resolveSession, ResolvedSession } from '@/lib/auth/session';

type AuthedHandler = (
  request: NextRequest,
  session: ResolvedSession,
  context: unknown,
) => Promise<Response>;

/**
 * Higher-order function that wraps a route handler with session authentication.
 *
 * Usage:
 *   export const GET = withAuth(async (request, session) => {
 *     // session.user.id is guaranteed to be set
 *   });
 *
 * Returns 401 with UNAUTHORIZED code if no valid session cookie is present.
 */
export function withAuth(handler: AuthedHandler) {
  return async (request: NextRequest, context: unknown): Promise<Response> => {
    const session = await resolveSession(request);
    if (!session) {
      return err('Authentication required', 'UNAUTHORIZED', 401);
    }
    return handler(request, session, context);
  };
}
