import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { getTopRates } from '@/services/AprService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);
  const rates = await getTopRates(limit);
  return ok(rates);
}
