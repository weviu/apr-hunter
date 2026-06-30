import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchKucoinAprs, verifyKucoinKey, fetchKucoinHoldings } from '@/exchanges/kucoin';

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

  it('throws when every endpoint fails (total auth/network failure)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('Unauthorized', { status: 401 }),
    );
    await expect(fetchKucoinAprs(API_KEY, SECRET, PASSPHRASE)).rejects.toThrow(/all 4 earn requests failed/);
  });

  it('returns partial results when some endpoints fail but one succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('/api/v3/earn/saving/products')) {
        return mockResponse({ code: '200000', data: [{ currency: 'USDT', recentApy: '0.048' }] });
      }
      return new Response('Unauthorized', { status: 401 }); // the other 3 fail
    });

    const results = await fetchKucoinAprs(API_KEY, SECRET, PASSPHRASE);
    expect(results.find((r) => r.asset === 'USDT')).toBeDefined();
  });

  it('does not throw when endpoints succeed with no products (legitimately empty)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      mockResponse({ code: '200000', data: [] }),
    );
    const results = await fetchKucoinAprs(API_KEY, SECRET, PASSPHRASE);
    expect(results).toEqual([]);
  });
});

describe('verifyKucoinKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves when the accounts endpoint returns code "200000"', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      mockResponse({ code: '200000', data: [] }),
    );
    await expect(verifyKucoinKey(API_KEY, SECRET, PASSPHRASE)).resolves.toBeUndefined();
  });

  it('throws on HTTP auth failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('Unauthorized', { status: 401 }),
    );
    await expect(verifyKucoinKey(API_KEY, SECRET, PASSPHRASE)).rejects.toThrow();
  });

  it('throws when the body carries a non-"200000" error code (HTTP 200)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      mockResponse({ code: '400003', msg: 'KC-API-KEY not exists' }),
    );
    await expect(verifyKucoinKey(API_KEY, SECRET, PASSPHRASE)).rejects.toThrow(/not exists/);
  });
});

describe('fetchKucoinHoldings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sums spot balances per asset and includes earn holdings', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('/api/v1/accounts')) {
        return mockResponse({
          code: '200000',
          data: [
            { currency: 'USDT', type: 'trade', balance: '100' },
            { currency: 'USDT', type: 'main', balance: '50' }, // summed → 150
            { currency: 'BTC', type: 'trade', balance: '0.01' },
            { currency: 'ETH', type: 'trade', balance: '0' }, // zero → skipped
          ],
        });
      }
      if (u.includes('hold-assets')) {
        return mockResponse({
          code: '200000',
          data: { items: [{ currency: 'USDT', holdAmount: '200', productCategory: 'SAVINGS' }] },
        });
      }
      return mockResponse({ code: '200000', data: [] });
    });

    const h = await fetchKucoinHoldings(API_KEY, SECRET, PASSPHRASE);
    expect(h.find((x) => x.asset === 'USDT' && x.type === 'spot')?.amount).toBe(150);
    expect(h.find((x) => x.asset === 'BTC' && x.type === 'spot')?.amount).toBe(0.01);
    expect(h.find((x) => x.asset === 'ETH')).toBeUndefined();
    expect(h.find((x) => x.type === 'earn')).toMatchObject({ asset: 'USDT', amount: 200 });
  });

  it('is best-effort: returns spot even if the earn endpoint fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('/api/v1/accounts')) {
        return mockResponse({ code: '200000', data: [{ currency: 'USDT', type: 'trade', balance: '10' }] });
      }
      return new Response('Unauthorized', { status: 401 }); // hold-assets fails
    });

    const h = await fetchKucoinHoldings(API_KEY, SECRET, PASSPHRASE);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ asset: 'USDT', amount: 10, type: 'spot' });
  });
});
