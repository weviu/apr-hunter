import { getDb } from '../db';

interface AprData {
  platform: string;
  asset: string;
  apr: number;
}

interface Alert {
  _id: any;
  userId: string;
  asset: string;
  platform: string;
  alertType: 'above' | 'below';
  threshold: number;
  isActive: boolean;
  lastTriggered?: Date;
}

export async function checkAlerts(aprDataList: AprData[]): Promise<number> {
  const db = await getDb();
  let triggeredCount = 0;

  try {
    const alerts = await db
      .collection('alerts')
      .find({ isActive: true })
      .toArray() as Alert[];

    if (alerts.length === 0) {
      return 0;
    }

    const aprMap = new Map<string, number>();
    for (const data of aprDataList) {
      const key = `${data.platform.toLowerCase()}:${data.asset.toUpperCase()}`;
      aprMap.set(key, data.apr);
    }

    for (const alert of alerts) {
      const key = `${alert.platform.toLowerCase()}:${alert.asset.toUpperCase()}`;
      const currentApr = aprMap.get(key);

      if (currentApr === undefined) {
        continue;
      }

      let shouldTrigger = false;

      if (alert.alertType === 'above' && currentApr > alert.threshold) {
        shouldTrigger = true;
      } else if (alert.alertType === 'below' && currentApr < alert.threshold) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        if (alert.lastTriggered) {
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (new Date(alert.lastTriggered) > hourAgo) {
            continue;
          }
        }

        const notification = {
          userId: alert.userId,
          alertId: alert._id,
          type: 'alert_triggered',
          title: `${alert.asset} APR Alert`,
          message: `${alert.asset} APR on ${alert.platform} is now ${currentApr.toFixed(2)}% (${alert.alertType} ${alert.threshold}%)`,
          data: {
            asset: alert.asset,
            platform: alert.platform,
            currentApr: currentApr,
            threshold: alert.threshold,
            alertType: alert.alertType,
          },
          read: false,
          createdAt: new Date(),
        };

        await db.collection('notifications').insertOne(notification);

        await db.collection('alerts').updateOne(
          { _id: alert._id },
          { $set: { lastTriggered: new Date() } }
        );

        triggeredCount++;
        console.log(`[AlertChecker] Alert triggered: ${alert.asset} on ${alert.platform} - ${currentApr.toFixed(2)}% ${alert.alertType} ${alert.threshold}%`);
      }
    }

    if (triggeredCount > 0) {
      console.log(`[AlertChecker] Total alerts triggered: ${triggeredCount}`);
    }

    return triggeredCount;
  } catch (error) {
    console.error('[AlertChecker] Error checking alerts:', error);
    return 0;
  }
}

export async function cleanupOldNotifications(): Promise<number> {
  const db = await getDb();
  
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await db.collection('notifications').deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`[AlertChecker] Cleaned up ${result.deletedCount} old notifications`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error('[AlertChecker] Error cleaning up notifications:', error);
    return 0;
  }
}

