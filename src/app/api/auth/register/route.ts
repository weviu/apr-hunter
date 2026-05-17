import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
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

  try {
    const user = await register(email, password, name);
    return ok({ user }, 201);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'EMAIL_TAKEN') {
      return err('Email already in use', 'EMAIL_TAKEN', 409);
    }
    console.error('[register]', e);
    return err('Registration failed', 'SERVER_ERROR', 500);
  }
}
