import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchBinanceAprs } from '@/exchanges/binance';

const API_KEY = 'test-key';
const SECRET  = 'test-secret';

// Helper to build a mock Response
function mockResponse(body: unknown, ok = true, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }) as Response & { ok: boolean };
}

describe('binance adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns snapshots from flexible earn endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('flexible/list')) {
        return mockResponse({
          rows: [
            { asset: 'USDT', latestAnnualPercentageRate: '0.05',  minPurchaseAmount: '10' },
            { asset: 'BTC',  latestAnnualPercentageRate: '0.028', minPurchaseAmount: '0.001' },
          ],
        });
      }
      // locked returns empty
      return mockResponse({ rows: [] });
    });

    const results = await fetchBinanceAprs(API_KEY, SECRET);
    expect(results.length).toBe(2);
    const usdt = results.find((r) => r.asset === 'USDT');
    expect(usdt?.apr).toBe(0.05);
    expect(usdt?.exchange).toBe('binance');
    expect(usdt?.source).toBe('live');
  });

  it('returns snapshots from locked earn endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('locked/list')) {
        return mockResponse({
          rows: [
            {
              asset: 'ETH',
              duration: 60,
              minPurchaseAmount: '0.1',
              detail: [
                { annualPercentageRate: '0.042' },
                { annualPercentageRate: '0.038' },
              ],
            },
          ],
        });
      }
      return mockResponse({ rows: [] });
    });

    const results = await fetchBinanceAprs(API_KEY, SECRET);
    const eth = results.find((r) => r.asset === 'ETH');
    expect(eth?.apr).toBe(0.042); // picks highest tier
    expect(eth?.product).toBe('60-Day Locked');
  });

  it('returns empty array and does not throw on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('{"code":-1001,"msg":"Unauthorized"}', { status: 401 });
    });

    const results = await fetchBinanceAprs(API_KEY, SECRET);
    expect(results).toEqual([]);
  });

  it('all returned APRs are decimals (< 1 for typical rates)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('flexible/list')) {
        return mockResponse({
          rows: [{ asset: 'USDC', latestAnnualPercentageRate: '0.049', minPurchaseAmount: '10' }],
        });
      }
      return mockResponse({ rows: [] });
    });

    const results = await fetchBinanceAprs(API_KEY, SECRET);
    results.forEach((r) => {
      expect(r.apr).toBeGreaterThan(0);
      expect(r.apr).toBeLessThan(1);
    });
  });
});
