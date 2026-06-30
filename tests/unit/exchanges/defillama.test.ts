import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDefiLlamaBestByAsset } from '@/exchanges/defillama';

function mockResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const OPTS = { project: 'aave-v3', exchange: 'aave', product: 'Aave v3 Supply' };

describe('defillama adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the best APY per asset for the requested project + chain', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({
        status: 'success',
        data: [
          { project: 'aave-v3', chain: 'Ethereum', symbol: 'USDC', apy: 5.0, tvlUsd: 50_000_000 },
          { project: 'aave-v3', chain: 'Ethereum', symbol: 'USDC', apy: 7.0, tvlUsd: 20_000_000 }, // higher  wins
          { project: 'aave-v3', chain: 'Ethereum', symbol: 'DAI', apy: 4.0, tvlUsd: 10_000_000 },
          { project: 'aave-v3', chain: 'Polygon', symbol: 'USDC', apy: 99, tvlUsd: 99_000_000 }, // wrong chain
          { project: 'yearn-finance', chain: 'Ethereum', symbol: 'USDC', apy: 99, tvlUsd: 99_000_000 }, // wrong project
        ],
      }),
    );

    const rows = await fetchDefiLlamaBestByAsset(OPTS);
    const byAsset = Object.fromEntries(rows.map((r) => [r.asset, r]));

    expect(rows).toHaveLength(2);
    expect(byAsset.USDC.apr).toBeCloseTo(0.07, 5); // best, normalised to decimal
    expect(byAsset.USDC.exchange).toBe('aave');
    expect(byAsset.USDC.source).toBe('live');
    expect(byAsset.DAI.apr).toBeCloseTo(0.04, 5);
  });

  it('skips thin pools, LP/multi-token symbols, and degenerate APYs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({
        status: 'success',
        data: [
          { project: 'aave-v3', chain: 'Ethereum', symbol: 'LOWTVL', apy: 40, tvlUsd: 100_000 }, // below TVL floor
          { project: 'aave-v3', chain: 'Ethereum', symbol: 'USDC-DAI', apy: 12, tvlUsd: 9_000_000 }, // LP pair
          { project: 'aave-v3', chain: 'Ethereum', symbol: 'CRAZY', apy: 5000, tvlUsd: 9_000_000 }, // degenerate APY
          { project: 'aave-v3', chain: 'Ethereum', symbol: 'GOOD', apy: 6, tvlUsd: 9_000_000 }, // keeper
        ],
      }),
    );

    const rows = await fetchDefiLlamaBestByAsset(OPTS);
    expect(rows.map((r) => r.asset)).toEqual(['GOOD']);
  });

  it('splits apr (base) from apy (total) and aliases WETH→ETH', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({
        status: 'success',
        data: [
          { project: 'aave-v3', chain: 'Ethereum', symbol: 'WETH', apy: 9.0, apyBase: 4.0, tvlUsd: 20_000_000 },
        ],
      }),
    );

    const rows = await fetchDefiLlamaBestByAsset(OPTS);
    expect(rows).toHaveLength(1);
    expect(rows[0].asset).toBe('ETH'); // WETH aliased to ETH
    expect(rows[0].apr).toBeCloseTo(0.04, 5); // base
    expect(rows[0].apy).toBeCloseTo(0.09, 5); // total
  });

  it('throws on a non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 503 }));
    await expect(fetchDefiLlamaBestByAsset(OPTS)).rejects.toThrow(/DefiLlama API 503/);
  });

  it('throws on an unexpected response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ status: 'success' }));
    await expect(fetchDefiLlamaBestByAsset(OPTS)).rejects.toThrow(/unexpected response shape/);
  });
});
