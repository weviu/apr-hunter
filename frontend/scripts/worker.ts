import path from 'path';
import { config as loadEnv } from 'dotenv';

// Load .env.local first (to match Next dev), then fallback to .env
loadEnv({ path: path.join(process.cwd(), '.env.local') });
loadEnv();

async function main() {
  // Dynamically import modules after env vars are loaded so they
  // pick up the correct connection settings (needed outside Next).
  const [{ getDb }, { scheduler }, { dataCollector }, { runtimeEnv }] = await Promise.all([
    import('../lib/server/db'),
    import('../lib/server/services/scheduler'),
    import('../lib/server/services/dataCollector'),
    import('../lib/server/env'),
  ]);

  await getDb();

  if (!runtimeEnv.ENABLE_DATA_COLLECTION) {
    console.log('[WORKER] Data collection disabled via ENABLE_DATA_COLLECTION=false');
    return;
  }

  console.log('[WORKER] Running initial data collection...');
  try {
    await dataCollector.collectAll();
  } catch (err) {
    console.error('[WORKER] Initial data collection failed:', err);
  }

  scheduler.startAll();
}

main().catch((err) => {
  console.error('[WORKER] Fatal error:', err);
  process.exit(1);
});

