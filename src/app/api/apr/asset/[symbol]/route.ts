import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { getRatesByAsset } from '@/services/AprService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const rates = await getRatesByAsset(symbol.toUpperCase());
  return ok({ symbol: symbol.toUpperCase(), rates });
}
