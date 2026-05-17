/**
 * Yearn Finance APR adapter — public REST API, no auth required.
 *
 * Fetches current APY from the Yearn API for Ethereum mainnet vaults.
 * Only includes endorsed (non-experimental) vaults with a positive APY.
 *
 * APR values are returned as DECIMALS (0.05 = 5%).
 */
import type { SnapshotInsert } from '@/repositories/aprRepository';

interface YearnVault {
  symbol: string;
  token: { symbol: string };
  apy: {
    net_apy: number;
    type: string;
  } | null;
  endorsed: boolean;
  type: string;
}

export async function fetchYearnAprs(): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];

  try {
    const res = await fetch(
      'https://api.yearn.finance/v1/chains/1/vaults/all',
      { cache: 'no-store' },
    );

    if (!res.ok) throw new Error(`Yearn API ${res.status}`);

    const vaults = (await res.json()) as YearnVault[];
    const syncedAt = new Date();

    for (const vault of vaults) {
      if (!vault.endorsed) continue;
      if (!vault.apy?.net_apy || vault.apy.net_apy <= 0) continue;

      const asset = vault.token?.symbol?.toUpperCase();
      if (!asset) continue;

      const apr = vault.apy.net_apy; // already a decimal

      // Keep best vault per asset
      const existing = results.findIndex((r) => r.exchange === 'yearn' && r.asset === asset);
      if (existing >= 0) {
        if ((results[existing].apr ?? 0) >= apr) continue;
        results.splice(existing, 1);
      }

      results.push({
        exchange: 'yearn',
        asset,
        product: `Yearn ${vault.type ?? 'Vault'}`,
        apr,
        apy: apr,
        minAmount: null,
        currency: 'USD',
        source: 'live',
        syncedAt,
      });
    }
  } catch (e) {
    console.warn('[yearn] APR fetch failed:', e);
  }

  return results;
}
