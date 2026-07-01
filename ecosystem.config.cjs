const path = require('node:path');

module.exports = {
  apps: [
    // ─── Next.js app (single process) ───────────────────────────────────────────
    // The APR sync runs inside this process via src/instrumentation.ts, which
    // schedules runAprSync() every 15 minutes at server startup. No separate
    // cron process is needed  see that file for the rationale.
    {
      name: 'apr-hunter',
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

    // ─── Signal scanner (Python) ─────────────────────────────────────────────────
    // Multi-strategy market scanner. Scans the 15m timeframe every 5 minutes and
    // stays resident (--loop), appending detections to data/alerts.json, which
    // /api/signals reads. cwd is the repo root so the scanner's relative feed path
    // (./data/alerts.json) lands where the API expects it.
    {
      name: 'signal-scanner',
      cwd: __dirname,
      script: path.join(__dirname, 'signalScanner/scanner.py'),
      interpreter: 'python3',
      args: '-tf 15m --loop 5',
      autorestart: true, // restart only on crash; normally never exits
      out_file: path.join(__dirname, 'signalScanner/logs/signal-scanner.log'),
      error_file: path.join(__dirname, 'signalScanner/logs/signal-scanner.log'),
      merge_logs: true,
    },
  ],
};
