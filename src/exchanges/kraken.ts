/**
 * Kraken Staking adapter — public API, no auth required.
 *
 * Kraken exposes staking asset info at:
 *   GET https://api.kraken.com/0/public/Staking/Assets
 *
 * APR values are returned as DECIMALS (0.05 = 5%).
 */
import type { SnapshotInsert } from '@/repositories/aprRepository';

interface KrakenStakingAsset {
  asset: string;
  staking_asset: string;
  rewards: { reward: string; type: string }[];
  on_chain: boolean;
  enabled: boolean;
  disabled: boolean;
  minimum_amount?: { staking: string; unstaking: string };
}

interface KrakenResponse {
  error: string[];
  result?: KrakenStakingAsset[];
}

export async function fetchKrakenAprs(): Promise<SnapshotInsert[]> {
  const results: SnapshotInsert[] = [];

  try {
    const res = await fetch('https://api.kraken.com/0/public/Staking/Assets', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Kraken API ${res.status}`);
    }

    const data = (await res.json()) as KrakenResponse;

    if (data.error?.length) {
      throw new Error(`Kraken error: ${data.error.join(', ')}`);
    }

    const syncedAt = new Date();

    for (const stake of (data.result ?? [])) {
      if (!stake.enabled || stake.disabled) continue;

      // Strip the .S / .ETH2 suffix Kraken appends to staking tickers
      const asset = stake.asset.replace(/\.(S|ETH2|W)$/, '').toUpperCase();

      // Kraken reward is expressed as a percentage string, e.g. "4.00"
      const rewardEntry = stake.rewards.find((r) => r.type === 'percentage');
      if (!rewardEntry) continue;

      const pct = parseFloat(rewardEntry.reward);
      if (isNaN(pct) || pct <= 0) continue;

      const apr = pct / 100; // convert to decimal

      results.push({
        exchange: 'kraken',
        asset,
        product: 'Staking',
        apr,
        apy: apr,
        minAmount: parseFloat(stake.minimum_amount?.staking ?? '0'),
        currency: 'USD',
        source: 'live',
        syncedAt,
      });
    }
  } catch (e) {
    console.warn('[kraken] Staking assets fetch failed:', e);
  }

  return results;
}
