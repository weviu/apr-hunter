import { NextRequest, NextResponse } from 'next/server';
import { getAprHistory } from '@/lib/db/repositories/aprRepository';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const asset = searchParams.get('asset');
  const platform = searchParams.get('platform');
  const range = searchParams.get('range') || '7d';

  if (!asset || !platform) {
    return NextResponse.json({ success: false, error: 'asset and platform are required' }, { status: 400 });
  }

  const now = Date.now();
  let sinceIso: string | undefined;
  if (range === '24h') {
    sinceIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  } else {
    // default 7d
    sinceIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const data = await getAprHistory(asset, platform, sinceIso, 500);

  return NextResponse.json({
    success: true,
    asset: asset.toUpperCase(),
    platform,
    data,
  });
}

