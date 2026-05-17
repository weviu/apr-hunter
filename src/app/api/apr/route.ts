import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { getAllRates } from '@/services/AprService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const exchange = searchParams.get('exchange') ?? undefined;
  const asset = searchParams.get('asset') ?? undefined;

  const rates = await getAllRates({ exchange, asset });
  return ok(rates);
}
