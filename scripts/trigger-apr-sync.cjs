#!/usr/bin/env node
'use strict';

/**
 * APR sync trigger  called by PM2 on the cron schedule in ecosystem.config.cjs.
 *
 * POSTs to /api/cron/refresh-apr with the X-Cron-Secret header.
 * Exits 0 on success, 1 on failure (PM2 logs both).
 *
 * Required env vars (read from the production environment):
 *   CRON_SECRET           must match the value in .env
 *   NEXT_PUBLIC_APP_URL   defaults to http://localhost:3000
 */

const secret = process.env.CRON_SECRET;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const endpoint = `${appUrl}/api/cron/refresh-apr`;

if (!secret) {
  console.error('[cron] CRON_SECRET is not set  aborting');
  process.exit(1);
}

async function run() {
  console.log(`[cron] ${new Date().toISOString()}  POST ${endpoint}`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Cron-Secret': secret,
      'Content-Type': 'application/json',
    },
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok) {
    console.log(`[cron] Sync complete (${res.status}):`, JSON.stringify(body));
  } else {
    console.error(`[cron] Sync failed (${res.status}):`, JSON.stringify(body));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[cron] Unexpected error:', err.message);
  process.exit(1);
});
