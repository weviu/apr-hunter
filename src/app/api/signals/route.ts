import { NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ok } from '@/lib/api/response';
import type { Signal } from '@/types/signal';

/**
 * Public market-wide trading signals.
 *
 * The Python signal-scanner (see ecosystem.config.cjs) scans every 5 minutes and
 * writes its detections to a JSON feed file. This route reads that file and
 * returns the signals, newest first. It never depends on the DB and never 500s
 * on a missing/unwritten feed — an empty list is a valid "no signals yet" state.
 *
 * Query params (more to come — direction/symbol/minConfidence filters are a
 * planned follow-up; the client already owns sorting/filtering seams):
 *   - limit: max signals to return (default 60, capped at 200).
 */
export const dynamic = 'force-dynamic';

function feedPath(): string {
  const configured = process.env.SIGNALS_FEED_PATH;
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  // Matches the scanner's default output (write_to_feed → ./data/alerts.json),
  // resolved against the app's working directory.
  return path.join(process.cwd(), 'data', 'alerts.json');
}

/** Feed timestamps are UTC "YYYY-MM-DD HH:MM:SS" with no zone marker. */
function toUtcMs(ts: string): number {
  const t = Date.parse(ts.replace(' ', 'T') + 'Z');
  return Number.isNaN(t) ? 0 : t;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requested = parseInt(searchParams.get('limit') ?? '60', 10);
  const limit = Math.min(Number.isNaN(requested) ? 60 : requested, 200);

  let signals: Signal[] = [];
  try {
    const raw = await fs.readFile(feedPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) signals = parsed as Signal[];
  } catch {
    // Missing / unreadable / malformed feed → treat as no signals yet.
    signals = [];
  }

  // Newest first. The scanner already prepends, but sort defensively so ordering
  // is guaranteed regardless of how the file was written.
  signals.sort((a, b) => toUtcMs(b.timestamp) - toUtcMs(a.timestamp));

  return ok(signals.slice(0, Math.max(0, limit)));
}
