import { NextRequest, NextResponse } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { sessionCookieOptions } from '@/lib/auth/cookies';
import { login } from '@/services/AuthService';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !email.trim()) {
    return err('email is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof password !== 'string' || !password) {
    return err('password is required', 'VALIDATION_ERROR', 422);
  }

  const userAgent = request.headers.get('user-agent') ?? undefined;

  try {
    const result = await login(email, password, userAgent);
    if (!result) {
      return err('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    const response = NextResponse.json(
      { success: true, data: { user: result.user } },
      { status: 200 },
    );
    response.cookies.set(sessionCookieOptions(result.token));
    return response;
  } catch (e) {
    console.error('[login]', e);
    return err('Login failed', 'SERVER_ERROR', 500);
  }
}
