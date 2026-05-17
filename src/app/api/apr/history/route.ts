import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { getAprHistory } from '@/services/AprService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const exchange = searchParams.get('exchange') ?? undefined;
  const asset = searchParams.get('asset') ?? undefined;
  const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 365);

  const history = await getAprHistory({ exchange, asset, days });
  return ok(history);
}
