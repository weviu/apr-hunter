/**
 * Aave v3 APR adapter — via the DefiLlama Yields API (public, no auth).
 *
 * The old aave-api-v2.aave.com host was retired. DefiLlama aggregates current
 * APYs across DeFi protocols, so we pull the `aave-v3` pools on Ethereum and
 * keep the best supply APY per asset above a TVL floor (to avoid surfacing thin,
 * risky pools).
 *
 * APR values are returned as DECIMALS (0.05 = 5%).
 */
import type { SnapshotInsert } from '@/repositories/aprRepository';
import { fetchDefiLlamaBestByAsset } from '@/exchanges/defillama';

export async function fetchAaveAprs(): Promise<SnapshotInsert[]> {
  return fetchDefiLlamaBestByAsset({
    project: 'aave-v3',
    exchange: 'aave',
    product: 'Aave v3 Supply',
  });
}
