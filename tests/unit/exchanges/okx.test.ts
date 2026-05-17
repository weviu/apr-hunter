import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchOkxAprs } from '@/exchanges/okx';

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
            { ccy: 'SOL', apy: '0.056', term: '0' },   // Flexible
            { ccy: 'SOL', apy: '0.048', term: '0' },   // duplicate Flexible — lower, should be skipped
            { ccy: 'SOL', apy: '0.072', term: '30' },  // 30-Day Staking — distinct
          ],
        });
      }
      return mockResponse({ code: '0', data: [] });
    });

    const results = await fetchOkxAprs(API_KEY, SECRET, PASSPHRASE);
    const flexSol = results.filter((r) => r.asset === 'SOL' && r.product === 'Flexible Earn');
    expect(flexSol).toHaveLength(1);
    expect(flexSol[0].apr).toBe(0.056); // higher rate wins
  });

  it('returns empty array and does not throw on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('Unauthorized', { status: 401 }),
    );
    const results = await fetchOkxAprs(API_KEY, SECRET, PASSPHRASE);
    expect(results).toEqual([]);
  });
});
