import cron from 'node-cron';
import { dataCollector } from './dataCollector';
import { checkAlerts, cleanupOldNotifications } from './alertChecker';
import { getDatabase } from '../config/database';

/**
 * Scheduler Service
 * Handles periodic data collection tasks
 */

class Scheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start the data collection scheduler
   * Runs every 30 seconds as specified in requirements
   */
  startDataCollection() {
    // Run every 30 seconds
    const job = cron.schedule('*/30 * * * * *', async () => {
      console.log('[SCHEDULER] Starting scheduled data collection...');
      try {
        const result = await dataCollector.collectAll();
        console.log(
          `[OK] Data collection completed: ${result.success} succeeded, ${result.failed} failed`
        );
        if (result.errors.length > 0) {
          console.error('Errors:', result.errors);
        }

        // Check alerts after data collection
        try {
          const db = getDatabase();
          const aprData = await db.collection('apr_data').find({}).toArray();
          const aprList = aprData.map(d => ({
            platform: d.platform,
            asset: d.asset,
            apr: d.apr
          }));
          await checkAlerts(aprList);
        } catch (alertError) {
          console.error('[SCHEDULER] Error checking alerts:', alertError);
        }
      } catch (error) {
        console.error('[ERROR] Scheduled data collection failed:', error);
      }
    });

    this.jobs.set('dataCollection', job);
    console.log('[SCHEDULER] Data collection scheduler started (runs every 30 seconds)');
  }

  /**
   * Start the notification cleanup scheduler
   * Runs daily at midnight
   */
  startNotificationCleanup() {
    const job = cron.schedule('0 0 * * *', async () => {
      console.log('[SCHEDULER] Running notification cleanup...');
      try {
        await cleanupOldNotifications();
      } catch (error) {
        console.error('[SCHEDULER] Notification cleanup failed:', error);
      }
    });

    this.jobs.set('notificationCleanup', job);
    console.log('[SCHEDULER] Notification cleanup scheduler started (runs daily at midnight)');
  }

  /**
   * Start all schedulers
   */
  startAll() {
    this.startDataCollection();
    this.startNotificationCleanup();
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`[SCHEDULER] Stopped: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    return {
      active: Array.from(this.jobs.keys()),
      count: this.jobs.size,
    };
  }
}

export const scheduler = new Scheduler();

