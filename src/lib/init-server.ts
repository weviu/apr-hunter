/**
 * Server initialization module
 * Runs once on server startup to initialize background services
 */

let initialized = false;

export async function initializeServer() {
  if (initialized) {
    return;
  }

  initialized = true;

  try {
    // Initialize APR sync service
    if (process.env.ENABLE_APR_SYNC !== 'false') {
      const { initializeAprSync } = await import('@/lib/services/apr-sync');
      const syncInterval = parseInt(process.env.APR_SYNC_INTERVAL || '30000', 10);
      await initializeAprSync(syncInterval);
      console.log('✓ APR sync service initialized');
    }
  } catch (error) {
    console.error('Error initializing server:', error);
  }
}
