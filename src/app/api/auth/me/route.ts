import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { getSessionToken } from '@/lib/auth/cookies';
import { me } from '@/services/AuthService';

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) {
    return err('Authentication required', 'UNAUTHORIZED', 401);
  }

  const user = await me(token);
  if (!user) {
    return err('Session expired or invalid', 'UNAUTHORIZED', 401);
  }

  return ok({ user });
}
