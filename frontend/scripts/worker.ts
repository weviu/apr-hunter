import path from 'path';
import { config as loadEnv } from 'dotenv';

// Load .env.local first (to match Next dev), then fallback to .env
loadEnv({ path: path.join(process.cwd(), '.env.local') });
loadEnv();
import { getDb } from '../lib/server/db';
import { scheduler } from '../lib/server/services/scheduler';
import { dataCollector } from '../lib/server/services/dataCollector';
import { runtimeEnv } from '../lib/server/env';

async function main() {
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

