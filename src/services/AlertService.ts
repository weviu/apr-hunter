import {
  createAlert,
  findAlertsByUserId,
  findAlertById,
  updateAlert,
  deleteAlert,
  findActiveAlertsByAsset,
  markAlertFired,
} from '@/repositories/alertRepository';
import { createNotification } from '@/repositories/notificationRepository';
import { getLatestAll } from '@/repositories/aprRepository';
import type { AlertData } from '@/repositories/alertRepository';

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createUserAlert(
  userId: string,
  data: {
    asset: string;
    exchange?: string | null;
    condition: 'above' | 'below';
    threshold: number;
  },
): Promise<AlertData> {
  const id = await createAlert(userId, data);
  const alert = await findAlertById(id);
  if (!alert) throw new Error('Alert creation failed');
  return alert;
}

export async function listAlerts(userId: string, activeOnly?: boolean): Promise<AlertData[]> {
  return findAlertsByUserId(userId, activeOnly);
}

export async function getAlert(alertId: string, userId: string): Promise<AlertData | null> {
  const alert = await findAlertById(alertId);
  if (!alert || alert.userId !== userId) return null;
  return alert;
}

export async function updateUserAlert(
  alertId: string,
  userId: string,
  data: Partial<{ condition: 'above' | 'below'; threshold: number; exchange: string | null; active: boolean }>,
): Promise<boolean> {
  const alert = await findAlertById(alertId);
  if (!alert || alert.userId !== userId) return false;
  return updateAlert(alertId, data);
}

export async function deleteUserAlert(alertId: string, userId: string): Promise<boolean> {
  const alert = await findAlertById(alertId);
  if (!alert || alert.userId !== userId) return false;
  return deleteAlert(alertId);
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

/**
 * Evaluate all active alerts against the current APR snapshots.
 * Called by AprSyncJob after each sync cycle.
 *
 * An alert fires when:
 *   condition=above  AND  currentApr > threshold
 *   condition=below  AND  currentApr < threshold
 *
 * A notification is created for each triggered alert.
 * Alerts are not disabled after firing  they remain active and can re-fire on
 * the next sync if the condition still holds (rate-limited by the 15-min cron).
 */
export async function evaluateAlerts(): Promise<void> {
  const snapshots = await getLatestAll();
  if (!snapshots.length) return;

  // Build a quick lookup: ASSET -> highest APR across all exchanges
  const bestApr = new Map<string, number>();
  for (const snap of snapshots) {
    const key = snap.asset.toUpperCase();
    bestApr.set(key, Math.max(bestApr.get(key) ?? 0, snap.apr));
  }

  const assets = [...bestApr.keys()];

  await Promise.allSettled(
    assets.map(async (asset) => {
      const currentApr = bestApr.get(asset)!;
      const alerts = await findActiveAlertsByAsset(asset);

      await Promise.allSettled(
        alerts.map(async (alert) => {
          const fired =
            (alert.condition === 'above' && currentApr > alert.threshold) ||
            (alert.condition === 'below' && currentApr < alert.threshold);

          if (!fired) return;

          const pct = (currentApr * 100).toFixed(2);
          const tpct = (alert.threshold * 100).toFixed(2);

          await createNotification(alert.userId, {
            type: 'alert_triggered',
            title: `${asset} APR alert triggered`,
            message: `${asset} APR is ${pct}%  ${alert.condition} your threshold of ${tpct}%`,
            relatedAlertId: alert.id,
          });

          await markAlertFired(alert.id);
        }),
      );
    }),
  );
}
