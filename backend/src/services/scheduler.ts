import cron from 'node-cron';
import { dataCollector } from './dataCollector';

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
      } catch (error) {
        console.error('[ERROR] Scheduled data collection failed:', error);
      }
    });

    this.jobs.set('dataCollection', job);
    console.log('[SCHEDULER] Data collection scheduler started (runs every 30 seconds)');
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Stopped scheduler: ${name}`);
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

