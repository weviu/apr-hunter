import { NextRequest, NextResponse } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { getSessionToken, clearCookieOptions } from '@/lib/auth/cookies';
import { logout } from '@/services/AuthService';

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);

  if (token) {
    try {
      await logout(token);
    } catch (e) {
      console.error('[logout]', e);
    }
  }

  const response = NextResponse.json({ success: true, data: { ok: true } });
  response.cookies.set(clearCookieOptions());
  return response;
}
