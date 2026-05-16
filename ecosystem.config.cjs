const path = require('node:path');

module.exports = {
  apps: [
    // ─── Next.js app ──────────────────────────────────────────────────────────
    {
      name: 'apr-hunter-v2',
      cwd: __dirname,
      script: path.join(__dirname, 'node_modules/next/dist/bin/next'),
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },

    // ─── APR sync cron (every 15 minutes) ────────────────────────────────────
    // Runs scripts/trigger-apr-sync.cjs, which POSTs to /api/cron/refresh-apr.
    // cron_restart: PM2 restarts (re-runs) the script on the given schedule.
    // autorestart: false means PM2 does not restart it on non-cron exits.
    {
      name: 'apr-hunter-v2-cron',
      cwd: __dirname,
      script: 'scripts/trigger-apr-sync.cjs',
      cron_restart: '*/15 * * * *',
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
