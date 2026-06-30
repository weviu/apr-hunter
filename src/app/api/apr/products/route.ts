import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { getProductOptions } from '@/services/AprService';

/**
 * GET /api/apr/products?asset=USDC&exchange=binance
 * Returns the distinct earn products for that asset+platform, each with its
 * latest APR  used to populate the product dropdown in the Add Position form.
 */
export async function GET(request: NextRequest) {
  const asset = request.nextUrl.searchParams.get('asset')?.trim();
  const exchange = request.nextUrl.searchParams.get('exchange')?.trim();

  if (!asset || !exchange) {
    return err('asset and exchange query params are required', 'BAD_REQUEST', 400);
  }

  const products = await getProductOptions(asset, exchange);
  return ok(products);
}
