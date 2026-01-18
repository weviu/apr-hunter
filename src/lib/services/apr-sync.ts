/**
 * APR Sync Service
 * Manages background synchronization of APR data from exchanges to database
 * Runs every 30 seconds to keep data fresh and ready for immediate frontend display
 */

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

export async function initializeAprSync(intervalMs = 30000) {
  if (syncInterval) {
    console.log('APR sync already initialized');
    return;
  }

  console.log(`Initializing APR sync service with ${intervalMs}ms interval`);

  // Run immediately on startup
  await performAprSync();

  // Then schedule recurring syncs
  syncInterval = setInterval(async () => {
    await performAprSync();
  }, intervalMs);
}

export async function stopAprSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('APR sync service stopped');
  }
}

async function performAprSync() {
  if (isSyncing) {
    console.log('APR sync already in progress, skipping...');
    return;
  }

  isSyncing = true;
  try {
    const apiUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const endpoint = `${apiUrl}/api/cron/refresh-apr`;
    const cronSecret = process.env.CRON_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cronSecret) {
      headers.authorization = `Bearer ${cronSecret}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      console.error(`APR sync failed with status ${response.status}:`, await response.text());
      return;
    }

    const result = await response.json();
    if (result.success) {
      console.log(`✓ APR sync completed: ${result.count} items at ${result.timestamp}`);
    } else {
      console.warn(`APR sync warning: ${result.message}`);
    }
  } catch (error) {
    console.error('APR sync error:', error);
  } finally {
    isSyncing = false;
  }
}
