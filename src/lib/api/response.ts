import { NextResponse } from 'next/server';

export interface OkResponse<T> {
  success: true;
  data: T;
}

export interface ErrResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * Returns a successful JSON response with the standard envelope.
 * { "success": true, "data": <T> }
 */
export function ok<T>(data: T, status = 200): NextResponse<OkResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Returns an error JSON response with the standard envelope.
 * { "success": false, "error": "<human message>", "code": "<MACHINE_CODE>" }
 */
export function err(
  message: string,
  code: string,
  status = 400,
): NextResponse<ErrResponse> {
  return NextResponse.json({ success: false, error: message, code }, { status });
}
