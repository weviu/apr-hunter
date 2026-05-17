import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { createUserAlert, listAlerts } from '@/services/AlertService';

export const GET = withAuth(async (_request: NextRequest, session) => {
  const alerts = await listAlerts(session.user.id);
  return ok(alerts);
});

export const POST = withAuth(async (request: NextRequest, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { asset, exchange, condition, threshold } = body as Record<string, unknown>;

  if (typeof asset !== 'string' || !asset.trim()) {
    return err('asset is required', 'VALIDATION_ERROR', 422);
  }
  if (condition !== 'above' && condition !== 'below') {
    return err('condition must be "above" or "below"', 'VALIDATION_ERROR', 422);
  }
  if (typeof threshold !== 'number' || threshold < 0) {
    return err('threshold must be a non-negative number', 'VALIDATION_ERROR', 422);
  }

  try {
    const alert = await createUserAlert(session.user.id, {
      asset: asset.trim(),
      exchange: typeof exchange === 'string' ? exchange : null,
      condition,
      threshold,
    });
    return ok(alert, 201);
  } catch (e) {
    console.error('[POST /api/alerts]', e);
    return err('Failed to create alert', 'SERVER_ERROR', 500);
  }
});
