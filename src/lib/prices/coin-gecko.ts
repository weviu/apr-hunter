import { Db } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';

type PriceDoc = {
  _id?: Record<string, unknown>;
  symbol: string;
  price: number;
  fetchedAt: string;
};

type SymbolMapDoc = {
  _id?: Record<string, unknown>;
  symbol: string;
  coingeckoId: string;
  fetchedAt: string;
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LTC: 'litecoin',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
};

const CACHE_TTL_MS = 60 * 1000; // 60s
const COLLECTION = 'prices';
const MAP_COLLECTION = 'price_symbol_map';
const MAP_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function fetchFromCoinGecko(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols.map((s) => COINGECKO_IDS[s.toUpperCase()]).filter(Boolean);
  if (!ids.length) return {};

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`CoinGecko error ${res.status}`);
  }
  const data = (await res.json()) as Record<string, { usd: number }>;

  const out: Record<string, number> = {};
  for (const [sym, id] of Object.entries(COINGECKO_IDS)) {
    if (data[id]?.usd !== undefined) {
      out[sym] = data[id].usd;
    }
  }
  return out;
}

async function getCached(db: Db, symbols: string[]): Promise<Record<string, number>> {
  const cutoff = Date.now() - CACHE_TTL_MS;
  const docs = await db
    .collection<PriceDoc>(COLLECTION)
    .find({ symbol: { $in: symbols }, fetchedAt: { $gte: new Date(cutoff).toISOString() } })
    .toArray();

  const map: Record<string, number> = {};
  docs.forEach((d) => {
    if (typeof d.price === 'number') {
      map[d.symbol] = d.price;
    }
  });
  return map;
}

async function upsertPrices(db: Db, prices: Record<string, number>) {
  const ops = Object.entries(prices).map(([symbol, price]) => ({
    updateOne: {
      filter: { symbol },
      update: { $set: { symbol, price, fetchedAt: new Date().toISOString() } },
      upsert: true,
    },
  }));
  if (ops.length) {
    await db.collection(COLLECTION).bulkWrite(ops, { ordered: false });
  }
}

export async function getPrices(symbols: string[]) {
  if (!symbols.length) return {};
  const db = await getMongoDb();
  if (!db) {
    return {};
  }

  // Resolve symbols to known CoinGecko ids, using cache + search fallback
  await resolveMissingSymbolIds(db, symbols);

  // Try cache
  const cached = await getCached(db, symbols);
  const missing = symbols.filter((s) => cached[s] === undefined);

  if (missing.length === 0) return cached;

  try {
    const fresh = await fetchFromCoinGecko(missing);
    await upsertPrices(db, fresh);
    return { ...cached, ...fresh };
  } catch (_e) {
    console.error('Price fetch failed', _e);
    return cached; // return whatever we have
  }
}

async function resolveMissingSymbolIds(db: Db, symbols: string[]) {
  const cutoff = Date.now() - MAP_TTL_MS;
  const symbolSet = Array.from(new Set(symbols.map((s) => s.toUpperCase())));

  // preload cached mappings
  const cached = await db
    .collection<SymbolMapDoc>(MAP_COLLECTION)
    .find({ symbol: { $in: symbolSet }, fetchedAt: { $gte: new Date(cutoff).toISOString() } })
    .toArray();
  cached.forEach((doc) => {
    if (doc.coingeckoId) {
      COINGECKO_IDS[doc.symbol.toUpperCase()] = doc.coingeckoId;
    }
  });

  const stillMissing = symbolSet.filter((s) => !COINGECKO_IDS[s]);
  if (!stillMissing.length) return;

  for (const sym of stillMissing) {
    try {
      const id = await searchCoinGeckoId(sym);
      if (id) {
        COINGECKO_IDS[sym] = id;
        await db
          .collection<SymbolMapDoc>(MAP_COLLECTION)
          .updateOne({ symbol: sym }, { $set: { symbol: sym, coingeckoId: id, fetchedAt: new Date().toISOString() } }, { upsert: true });
      }
    } catch {
      // ignore search failures
    }
  }
}

async function searchCoinGeckoId(symbol: string): Promise<string | null> {
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { coins?: { id: string; symbol: string }[] };
  const match = data?.coins?.find((c) => c.symbol?.toUpperCase() === symbol.toUpperCase());
  return match?.id || null;
}

