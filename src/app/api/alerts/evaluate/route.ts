import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { env } from '@/lib/env';
import { fetchAllAprOpportunities } from '@/lib/exchanges/registry';

// Config
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

type AlertDoc = {
  _id: ObjectId;
  userId: ObjectId;
  asset: string;
  platform: string;
  alertType: 'above' | 'below';
  threshold: number;
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string | null;
};

function isAuthorized(req: Request) {
  const secret = env.ALERT_EVAL_SECRET;
  if (!secret) return false;
  const header = req.headers.get('x-cron-secret') || req.headers.get('authorization');
  if (!header) return false;
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  return token === secret;
}

function shouldTrigger(alert: AlertDoc, apr: number) {
  if (alert.alertType === 'above') return apr >= alert.threshold;
  return apr <= alert.threshold;
}

function onCooldown(alert: AlertDoc) {
  if (!alert.lastTriggered) return false;
  const last = new Date(alert.lastTriggered).getTime();
  return Date.now() - last < COOLDOWN_MS;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getMongoDb();
  if (!db) {
    return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
  }

  // Fetch live APRs
  const aprData = await fetchAllAprOpportunities();
  const aprMap = new Map<string, number>();
  aprData.forEach((item) => {
    const key = `${item.platform.toLowerCase()}-${item.asset.toUpperCase()}`;
    if (!aprMap.has(key)) {
      aprMap.set(key, item.apr);
    }
  });

  const alerts = await db
    .collection<AlertDoc>('alerts')
    .find({ isActive: true })
    .toArray();

  const notifications: Record<string, unknown>[] = [];
  const nowIso = new Date().toISOString();

  for (const alert of alerts) {
    const key = `${alert.platform.toLowerCase()}-${alert.asset.toUpperCase()}`;
    const apr = aprMap.get(key);
    if (apr === undefined) continue;
    if (onCooldown(alert)) continue;
    if (!shouldTrigger(alert, apr)) continue;

    // Build notification
    notifications.push({
      userId: alert.userId,
      title: `APR ${alert.alertType === 'above' ? 'above' : 'below'} ${alert.threshold}%`,
      message: `${alert.asset} on ${alert.platform} is ${apr.toFixed(2)}%`,
      type: 'alert',
      read: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Update alert lastTriggered
    await db
      .collection('alerts')
      .updateOne({ _id: alert._id }, { $set: { lastTriggered: nowIso, updatedAt: nowIso } });
  }

  if (notifications.length > 0) {
    await db.collection('notifications').insertMany(notifications);
  }

  return NextResponse.json({ success: true, triggered: notifications.length });
}

