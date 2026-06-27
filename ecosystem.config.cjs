const path = require('node:path');

module.exports = {
  apps: [
    // ─── Next.js app (single process) ───────────────────────────────────────────
    // The APR sync runs inside this process via src/instrumentation.ts, which
    // schedules runAprSync() every 15 minutes at server startup. No separate
    // cron process is needed — see that file for the rationale.
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
  ],
};
