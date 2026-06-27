/**
 * Next.js instrumentation hook — runs ONCE when the server process boots.
 *
 * This is the single-process APR scheduler. It replaces the separate PM2 cron
 * app + trigger-apr-sync.cjs: instead of an external process POSTing to
 * /api/cron/refresh-apr every 15 minutes, the web server itself schedules the
 * sync in the background and calls runAprSync() directly.
 *
 * Why this is safe (unlike v1's setInterval in layout.tsx):
 *   - register() is invoked exactly once, at server startup — never per request,
 *     never per render, and never during `next build`.
 *   - It is guarded to the Node.js runtime (skipped on the Edge runtime) and to
 *     a single execution via a global flag (dev hot-reload safety).
 *   - The sync runs in the background; it never blocks an HTTP response, so a
 *     slow exchange call can't surface as request latency.
 */

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export async function register(): Promise<void> {
  // Only schedule inside the Node.js server runtime (not Edge, not the browser).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // In development the AprService seeds sample data on demand, so there is no
  // need to hammer the DB on every hot reload. Only schedule in production.
  if (process.env.NODE_ENV !== 'production') return;

  // Guard against double-scheduling if register() is ever invoked twice.
  const g = globalThis as typeof globalThis & { __aprSyncStarted?: boolean };
  if (g.__aprSyncStarted) return;
  g.__aprSyncStarted = true;

  const { runAprSync } = await import('@/services/AprSyncJob');

  const tick = async (): Promise<void> => {
    try {
      const r = await runAprSync();
      console.log(
        `[apr-sync] ${r.source} — ${r.snapshotCount} snapshots in ${r.durationMs}ms` +
          (r.errors.length ? ` (${r.errors.length} errors)` : ''),
      );
    } catch (e) {
      console.error('[apr-sync] run failed:', e);
    }
  };

  // Run once on boot for immediate freshness, then every 15 minutes.
  void tick();
  const timer = setInterval(() => void tick(), SYNC_INTERVAL_MS);

  // Don't let the timer alone keep the process alive on shutdown.
  if (typeof timer.unref === 'function') timer.unref();
}
