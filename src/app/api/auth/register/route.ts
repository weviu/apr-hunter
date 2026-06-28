import { NextRequest, NextResponse } from 'next/server';
import { err } from '@/lib/api/response';
import { sessionCookieOptions } from '@/lib/auth/cookies';
import { register } from '@/services/AuthService';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { email, password, name } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !email.trim()) {
    return err('email is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof password !== 'string' || password.length < 8) {
    return err('password must be at least 8 characters', 'VALIDATION_ERROR', 422);
  }
  if (typeof name !== 'string' || !name.trim()) {
    return err('name is required', 'VALIDATION_ERROR', 422);
  }

  const userAgent = request.headers.get('user-agent') ?? undefined;

  try {
    const result = await register(email, password, name, userAgent);
    // Establish the session immediately so signup logs the user in.
    const response = NextResponse.json(
      { success: true, data: { user: result.user } },
      { status: 201 },
    );
    response.cookies.set(sessionCookieOptions(result.token));
    return response;
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'EMAIL_TAKEN') {
      return err('Email already in use', 'EMAIL_TAKEN', 409);
    }
    console.error('[register]', e);
    return err('Registration failed', 'SERVER_ERROR', 500);
  }
}
