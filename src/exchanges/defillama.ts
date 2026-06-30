/**
 * DefiLlama Yields adapter helper — public, no auth.
 *
 * One endpoint (https://yields.llama.fi/pools) returns current APYs across
 * hundreds of DeFi protocols. We filter to a single project (e.g. aave-v3,
 * yearn-finance) on Ethereum and keep the best APY per asset above a TVL floor,
 * so a thin $30k pool advertising 46% never outranks a real opportunity.
 *
 * APR values are returned as DECIMALS (0.05 = 5%).
 */
import type { SnapshotInsert } from '@/repositories/aprRepository';

const POOLS_URL = 'https://yields.llama.fi/pools';

/** Pools below this TVL are ignored — too thin to treat as a real opportunity. */
const MIN_TVL_USD = 1_000_000;
/** APY above this is almost certainly a transient/degenerate pool; skip it. */
const MAX_APY_PCT = 200;

interface LlamaPool {
  project: string;
  chain: string;
  symbol: string;
  apy: number | null;
  tvlUsd: number | null;
}

interface LlamaResponse {
  status: string;
  data: LlamaPool[];
}

export async function fetchDefiLlamaBestByAsset(opts: {
  project: string;
  exchange: string;
  product: string;
  chain?: string;
}): Promise<SnapshotInsert[]> {
  const chain = opts.chain ?? 'Ethereum';

  const res = await fetch(POOLS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`DefiLlama API ${res.status}`);

  const body = (await res.json()) as LlamaResponse;
  if (!Array.isArray(body?.data)) {
    throw new Error('DefiLlama API: unexpected response shape');
  }

  const syncedAt = new Date();
  // Keep the single best APY per asset symbol.
  const best = new Map<string, SnapshotInsert>();

  for (const pool of body.data) {
    if (pool.project !== opts.project || pool.chain !== chain) continue;

    const asset = (pool.symbol ?? '').toUpperCase();
    const apyPct = pool.apy ?? 0;
    // Skip LP/multi-token pools (symbols like "USDC-DAI"), zero/degenerate
    // rates, and thin pools.
    if (!asset || asset.includes('-')) continue;
    if (apyPct <= 0 || apyPct > MAX_APY_PCT) continue;
    if ((pool.tvlUsd ?? 0) < MIN_TVL_USD) continue;

    const apr = apyPct / 100; // DefiLlama returns whole-percent
    const existing = best.get(asset);
    if (existing && (existing.apr ?? 0) >= apr) continue;

    best.set(asset, {
      exchange: opts.exchange,
      asset,
      product: opts.product,
      apr,
      apy: apr,
      minAmount: null,
      currency: 'USD',
      source: 'live',
      syncedAt,
    });
  }

  return [...best.values()];
}
