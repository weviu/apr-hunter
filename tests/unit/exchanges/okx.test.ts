import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchOkxAprs, verifyOkxKey } from '@/exchanges/okx';

const API_KEY    = 'test-key';
const SECRET     = 'test-secret';
const PASSPHRASE = 'test-pass';

function mockResponse(body: unknown, ok = true, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('okx adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns snapshots from savings balance endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('savings/balance')) {
        return mockResponse({
          code: '0',
          data: [
            { ccy: 'USDT', lendingRate: '0.052' },
            { ccy: 'ETH',  lendingRate: '0.038' },
          ],
        });
      }
      return mockResponse({ code: '0', data: [] });
    });

    const results = await fetchOkxAprs(API_KEY, SECRET, PASSPHRASE);
    expect(results.length).toBe(2);
    const usdt = results.find((r) => r.asset === 'USDT');
    expect(usdt?.apr).toBe(0.052);
    expect(usdt?.exchange).toBe('okx');
    expect(usdt?.source).toBe('live');
  });

  it('merges staking offers without duplicate asset+product pairs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('staking-defi/offers')) {
        return mockResponse({
          code: '0',
          data: [
            { ccy: 'SOL', apy: '0.056', term: '0' },   // Flexible staking
            { ccy: 'SOL', apy: '0.048', term: '0' },   // duplicate  lower, should be skipped
            { ccy: 'SOL', apy: '0.072', term: '30' },  // 30-Day Staking  distinct
          ],
        });
      }
      return mockResponse({ code: '0', data: [] });
    });

    const results = await fetchOkxAprs(API_KEY, SECRET, PASSPHRASE);
    const flexSol = results.filter((r) => r.asset === 'SOL' && r.product === 'Staking');
    expect(flexSol).toHaveLength(1);
    expect(flexSol[0].apr).toBe(0.056); // higher rate wins
  });

  it('throws when every request fails (total auth/network failure)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('Unauthorized', { status: 401 }),
    );
    await expect(fetchOkxAprs(API_KEY, SECRET, PASSPHRASE)).rejects.toThrow(/all 2 requests failed/);
  });

  it('returns partial results when only one endpoint fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes('savings/balance')) {
        return mockResponse({ code: '0', data: [{ ccy: 'USDT', lendingRate: '0.052' }] });
      }
      return new Response('Unauthorized', { status: 401 }); // staking fails
    });

    const results = await fetchOkxAprs(API_KEY, SECRET, PASSPHRASE);
    expect(results.length).toBe(1);
    expect(results[0].asset).toBe('USDT');
  });
});

describe('verifyOkxKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves when the balance endpoint returns code "0"', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      mockResponse({ code: '0', data: [] }),
    );
    await expect(verifyOkxKey(API_KEY, SECRET, PASSPHRASE)).resolves.toBeUndefined();
  });

  it('throws on HTTP auth failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('Unauthorized', { status: 401 }),
    );
    await expect(verifyOkxKey(API_KEY, SECRET, PASSPHRASE)).rejects.toThrow();
  });

  it('throws when the body carries a non-"0" error code (HTTP 200)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      mockResponse({ code: '50111', msg: 'Invalid API Key' }),
    );
    await expect(verifyOkxKey(API_KEY, SECRET, PASSPHRASE)).rejects.toThrow(/Invalid API Key/);
  });
});
