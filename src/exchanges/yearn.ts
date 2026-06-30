/**
 * Yearn APR adapter — via the DefiLlama Yields API (public, no auth).
 *
 * The old api.yearn.finance host was retired. DefiLlama exposes Yearn's vault
 * APYs under the `yearn-finance` project, so we pull those on Ethereum and keep
 * the best APY per asset above a TVL floor.
 *
 * APR values are returned as DECIMALS (0.05 = 5%).
 */
import type { SnapshotInsert } from '@/repositories/aprRepository';
import { fetchDefiLlamaBestByAsset } from '@/exchanges/defillama';

export async function fetchYearnAprs(): Promise<SnapshotInsert[]> {
  return fetchDefiLlamaBestByAsset({
    project: 'yearn-finance',
    exchange: 'yearn',
    product: 'Yearn Vault',
  });
}
