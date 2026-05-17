import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchKucoinAprs } from '@/exchanges/kucoin';

const API_KEY    = 'test-key';
const SECRET     = 'test-secret';
const PASSPHRASE = 'test-pass';

function mockResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('kucoin adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns snapshots from savings endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('saving/products')) {
        return mockResponse({
          code: '200000',
          data: [
            { currency: 'USDT', recentApy: '0.048', minDepositAmount: '10' },
            { currency: 'BTC',  recentApy: '0.025', minDepositAmount: '0.001' },
          ],
        });
      }
      // staking endpoints return empty
      return mockResponse({ code: '200000', data: [] });
    });

    const results = await fetchKucoinAprs(API_KEY, SECRET, PASSPHRASE);
    const usdt = results.find((r) => r.asset === 'USDT');
    expect(usdt).toBeDefined();
    expect(usdt?.apr).toBeCloseTo(0.048, 4);
    expect(usdt?.exchange).toBe('kucoin');
    expect(usdt?.source).toBe('live');
  });

  it('normalises percentage APR values (> 1) to decimals', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('saving/products')) {
        return mockResponse({
          code: '200000',
          data: [
            { currency: 'ADA', recentApy: '7.1' }, // 7.1 % — needs /100
          ],
        });
      }
      return mockResponse({ code: '200000', data: [] });
    });

    const results = await fetchKucoinAprs(API_KEY, SECRET, PASSPHRASE);
    const ada = results.find((r) => r.asset === 'ADA');
    expect(ada?.apr).toBeCloseTo(0.071, 4);
  });

  it('keeps the best rate per (asset, product) combination', async () => {
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('saving/products')) {
        callCount++;
        if (callCount === 1) {
          // v3 endpoint — higher rate
          return mockResponse({ code: '200000', data: [{ currency: 'ETH', recentApy: '0.042' }] });
        }
        // v1 endpoint — lower rate
        return mockResponse({ code: '200000', data: [{ currency: 'ETH', recentApy: '0.038' }] });
      }
      return mockResponse({ code: '200000', data: [] });
    });

    const results = await fetchKucoinAprs(API_KEY, SECRET, PASSPHRASE);
    const eth = results.filter((r) => r.asset === 'ETH' && r.product === 'Flexible');
    expect(eth).toHaveLength(1);
    expect(eth[0].apr).toBeCloseTo(0.042, 4); // highest rate
  });

  it('returns empty array and does not throw on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('Unauthorized', { status: 401 }),
    );
    const results = await fetchKucoinAprs(API_KEY, SECRET, PASSPHRASE);
    expect(results).toEqual([]);
  });
});
