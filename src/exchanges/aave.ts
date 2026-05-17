/**
 * Aave v3 APR adapter — public REST API, no auth required.
 *
 * Uses the Aave Utilities Data API to fetch current supply APRs
 * for all active markets on Ethereum mainnet.
 *
 * APR values are returned as DECIMALS (0.05 = 5%).
 */
import type { SnapshotInsert } from '@/repositories/aprRepository';

interface AaveReserve {
  symbol: string;
  supplyAPY: string;
  variableBorrowAPY: string;
  liquidityRate: string; // ray units (1e27)
  isActive: boolean;
  isFrozen: boolean;
}

interface AaveApiResponse {
  [key: string]: AaveReserve;
}

export async function fetchAaveAprs(): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];

  try {
    // Aave Data API for on-chain reserve data (no API key needed)
    const res = await fetch(
      'https://aave-api-v2.aave.com/data/liquidity/v2?poolId=0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
      { cache: 'no-store' },
    );

    if (!res.ok) throw new Error(`Aave API ${res.status}`);

    const data = (await res.json()) as AaveApiResponse;
    const syncedAt = new Date();

    for (const reserve of Object.values(data)) {
      if (!reserve.isActive || reserve.isFrozen) continue;

      const asset = reserve.symbol?.toUpperCase();
      if (!asset) continue;

      const apr = parseFloat(reserve.supplyAPY);
      if (isNaN(apr) || apr <= 0) continue;

      results.push({
        exchange: 'aave',
        asset,
        product: 'Aave v3 Supply',
        apr,
        apy: apr,
        minAmount: null,
        currency: 'USD',
        source: 'live',
        syncedAt,
      });
    }
  } catch (e) {
    console.warn('[aave] APR fetch failed:', e);
  }

  return results;
}
