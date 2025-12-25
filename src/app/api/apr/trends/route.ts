import { NextRequest, NextResponse } from 'next/server';
import { getAprHistory } from '@/lib/db/repositories/aprRepository';

type Trend = {
  deltaAbs: number;
  deltaPct: number;
  trend: 'up' | 'down' | 'flat';
};

function computeTrend(latest: number, past: number | null): Trend {
  if (past === null) return { deltaAbs: 0, deltaPct: 0, trend: 'flat' };
  const deltaAbs = latest - past;
  const deltaPct = past !== 0 ? (deltaAbs / past) * 100 : 0;
  const trend = Math.abs(deltaAbs) < 0.0001 ? 'flat' : deltaAbs > 0 ? 'up' : 'down';
  return { deltaAbs, deltaPct, trend };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const asset = searchParams.get('asset');
  const platform = searchParams.get('platform');

  if (!asset || !platform) {
    return NextResponse.json({ success: false, error: 'asset and platform are required' }, { status: 400 });
  }

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch recent history; we’ll reuse the same query for both windows and slice
  const history = await getAprHistory(asset, platform, since7d, 1000);
  const latest = history[0]?.apr ?? null;

  const findClosest = (sinceIso: string) => {
    const target = new Date(sinceIso).getTime();
    let best: number | null = null;
    for (const point of history) {
      const t = new Date(point.capturedAt).getTime();
      if (t <= target) {
        best = point.apr;
        break;
      }
    }
    return best;
  };

  const past24h = findClosest(since24h);
  const past7d = findClosest(since7d);

  const trend24h = latest !== null ? computeTrend(latest, past24h) : { deltaAbs: 0, deltaPct: 0, trend: 'flat' };
  const trend7d = latest !== null ? computeTrend(latest, past7d) : { deltaAbs: 0, deltaPct: 0, trend: 'flat' };

  return NextResponse.json({
    success: true,
    asset: asset.toUpperCase(),
    platform,
    latest,
    trend24h,
    trend7d,
  });
}

