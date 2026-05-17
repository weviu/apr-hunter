import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { ok, err } from '@/lib/api/response';
import { env } from '@/lib/env';
import { runAprSync } from '@/services/AprSyncJob';

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');

  // Constant-time compare to prevent timing attacks
  if (!cronSecret || !timingSafeEqual(cronSecret, env.CRON_SECRET)) {
    return err('Forbidden', 'FORBIDDEN', 403);
  }

  try {
    const result = await runAprSync();
    return ok({
      synced: result.snapshotCount,
      source: result.source,
      durationMs: result.durationMs,
      errors: result.errors,
    });
  } catch (e) {
    console.error('[cron/refresh-apr]', e);
    return err('Sync failed', 'SERVER_ERROR', 500);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
      // Still compare to avoid length-based timing leak
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
