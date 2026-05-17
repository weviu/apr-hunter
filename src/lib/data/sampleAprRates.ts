/**
 * Static fallback rates used when live exchange fetching is disabled
 * (ENABLE_LIVE_EXCHANGE_FETCH !== 'true') or when a live fetch fails.
 *
 * APR values are stored as decimals: 0.05 = 5%.
 */
import type { SnapshotInsert } from '@/repositories/aprRepository';

export const sampleAprData: SnapshotInsert[] = [
  // ─── Binance ────────────────────────────────────────────────────────────────
  { exchange: 'binance', asset: 'BTC',  product: 'Flexible Savings', apr: 0.028, apy: 0.029, minAmount: 0.01, currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'binance', asset: 'ETH',  product: '60-Day Locked',    apr: 0.042, apy: 0.043, minAmount: 0.1,  currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'binance', asset: 'USDT', product: 'Flexible Savings', apr: 0.05,  apy: 0.051, minAmount: 10,   currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'binance', asset: 'USDC', product: 'Flexible Savings', apr: 0.049, apy: 0.05,  minAmount: 10,   currency: 'USD', source: 'sample', syncedAt: new Date() },

  // ─── OKX ────────────────────────────────────────────────────────────────────
  { exchange: 'okx', asset: 'SOL',  product: 'Flexible Earn', apr: 0.056, apy: 0.058, minAmount: 0.5, currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'okx', asset: 'ETH',  product: 'Flexible Earn', apr: 0.038, apy: 0.039, minAmount: 0.1, currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'okx', asset: 'USDT', product: 'Flexible Earn', apr: 0.052, apy: 0.053, minAmount: 10,  currency: 'USD', source: 'sample', syncedAt: new Date() },

  // ─── KuCoin ─────────────────────────────────────────────────────────────────
  { exchange: 'kucoin', asset: 'ADA',  product: '30-Day Staking', apr: 0.071, apy: 0.074, minAmount: 20,  currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'kucoin', asset: 'USDT', product: 'Flexible Savings', apr: 0.048, apy: 0.049, minAmount: 10, currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'kucoin', asset: 'BTC',  product: 'Flexible Savings', apr: 0.025, apy: 0.026, minAmount: 0.001, currency: 'USD', source: 'sample', syncedAt: new Date() },

  // ─── Kraken ─────────────────────────────────────────────────────────────────
  { exchange: 'kraken', asset: 'DOT',  product: 'Staking', apr: 0.093, apy: 0.097, minAmount: 1,  currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'kraken', asset: 'ATOM', product: 'Staking', apr: 0.142, apy: 0.148, minAmount: 1,  currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'kraken', asset: 'ETH',  product: 'Staking', apr: 0.04,  apy: 0.041, minAmount: 0.1, currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'kraken', asset: 'SOL',  product: 'Staking', apr: 0.058, apy: 0.06,  minAmount: 0.5, currency: 'USD', source: 'sample', syncedAt: new Date() },

  // ─── Aave ───────────────────────────────────────────────────────────────────
  { exchange: 'aave', asset: 'USDC', product: 'Aave v3 Supply', apr: 0.084, apy: 0.086, minAmount: 100, currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'aave', asset: 'USDT', product: 'Aave v3 Supply', apr: 0.078, apy: 0.08,  minAmount: 100, currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'aave', asset: 'WETH', product: 'Aave v3 Supply', apr: 0.021, apy: 0.021, minAmount: 0.1, currency: 'USD', source: 'sample', syncedAt: new Date() },

  // ─── Yearn ──────────────────────────────────────────────────────────────────
  { exchange: 'yearn', asset: 'WETH', product: 'Yearn Vault', apr: 0.121, apy: 0.128, minAmount: 0.5, currency: 'USD', source: 'sample', syncedAt: new Date() },
  { exchange: 'yearn', asset: 'USDC', product: 'Yearn Vault', apr: 0.095, apy: 0.100, minAmount: 100, currency: 'USD', source: 'sample', syncedAt: new Date() },
];
