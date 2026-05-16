import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';

import { ok, err } from '@/lib/api/response';

describe('ok()', () => {
  it('returns success: true with the provided data', async () => {
    const res = ok({ id: 1, name: 'test' });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1, name: 'test' });
  });

  it('defaults to HTTP 200', () => {
    const res = ok({});
    expect(res.status).toBe(200);
  });

  it('accepts a custom status code', () => {
    const res = ok({ created: true }, 201);
    expect(res.status).toBe(201);
  });

  it('never includes error or code fields', async () => {
    const body = await ok({ x: 1 }).json();
    expect(body).not.toHaveProperty('error');
    expect(body).not.toHaveProperty('code');
  });
});

describe('err()', () => {
  it('returns success: false with message and code', async () => {
    const res = err('Not found', 'NOT_FOUND', 404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Not found');
    expect(body.code).toBe('NOT_FOUND');
  });

  it('defaults to HTTP 400', () => {
    const res = err('Bad input', 'BAD_INPUT');
    expect(res.status).toBe(400);
  });

  it('accepts a custom status code', () => {
    const res = err('Unauthorized', 'UNAUTHORIZED', 401);
    expect(res.status).toBe(401);
  });

  it('never includes a data field', async () => {
    const body = await err('oops', 'OOPS').json();
    expect(body).not.toHaveProperty('data');
  });

  it('returns a NextResponse instance', () => {
    expect(err('x', 'X')).toBeInstanceOf(NextResponse);
  });
});
