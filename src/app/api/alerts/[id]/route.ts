import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { updateUserAlert, deleteUserAlert } from '@/services/AlertService';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { threshold, active, condition, exchange } = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (typeof threshold === 'number' && threshold >= 0) update.threshold = threshold;
  if (typeof active === 'boolean') update.active = active;
  if (condition === 'above' || condition === 'below') update.condition = condition;
  if (exchange !== undefined) update.exchange = typeof exchange === 'string' ? exchange : null;

  if (Object.keys(update).length === 0) {
    return err('No valid fields to update', 'VALIDATION_ERROR', 422);
  }

  const updated = await updateUserAlert(id, session.user.id, update as Parameters<typeof updateUserAlert>[2]);
  if (!updated) return err('Alert not found', 'NOT_FOUND', 404);

  const { findAlertById } = await import('@/repositories/alertRepository');
  const alert = await findAlertById(id);
  return ok(alert);
});

export const DELETE = withAuth(async (_request: NextRequest, session, context) => {
  const { id } = await (context as Ctx).params;
  const deleted = await deleteUserAlert(id, session.user.id);
  if (!deleted) return err('Alert not found', 'NOT_FOUND', 404);
  return ok({ id });
});
