import crypto from 'node:crypto';
import { env } from '@/lib/env';
import { sampleAprData } from '@/lib/data/sampleAprRates';
import { AprOpportunity } from '@/types/apr';

type Connector = {
  id: string;
  label: string;
  fetcher: () => Promise<AprOpportunity[]>;
};

const connectors: Connector[] = [
  { id: 'binance', label: 'Binance Simple Earn', fetcher: fetchBinanceAprs },
  { id: 'okx', label: 'OKX Earn', fetcher: () => fetchStaticByPlatform('OKX') },
  { id: 'kucoin', label: 'KuCoin Earn', fetcher: () => fetchStaticByPlatform('KuCoin') },
  { id: 'kraken', label: 'Kraken Staking', fetcher: () => fetchStaticByPlatform('Kraken') },
  { id: 'aave', label: 'Aave v3', fetcher: () => fetchStaticByPlatform('Aave') },
  { id: 'yearn', label: 'Yearn Vaults', fetcher: () => fetchStaticByPlatform('Yearn') },
];

export async function fetchAllAprOpportunities(): Promise<AprOpportunity[]> {
  if (env.ENABLE_LIVE_EXCHANGE_FETCH !== 'true') {
    return sampleAprData;
  }

  const responses = await Promise.allSettled(connectors.map((connector) => connector.fetcher()));
  const live: AprOpportunity[] = [];

  for (const res of responses) {
    if (res.status === 'fulfilled') {
      live.push(
        ...res.value.map((item) => ({
          ...item,
          lastUpdated: item.lastUpdated ?? new Date().toISOString(),
        })),
      );
    }
  }

  if (live.length === 0) {
    return sampleAprData;
  }

  return live;
}

export async function fetchAprBySymbol(symbol: string) {
  const data = await fetchAllAprOpportunities();
  return data.filter((row) => row.symbol.toUpperCase() === symbol.toUpperCase());
}

export async function fetchTopAprOpportunities(limit = 10) {
  const data = await fetchAllAprOpportunities();
  return [...data].sort((a, b) => b.apr - a.apr).slice(0, limit);
}

export async function listSupportedAssets() {
  const data = await fetchAllAprOpportunities();
  const map = new Map<string, string>();
  data.forEach((item) => map.set(item.symbol, item.asset));
  return Array.from(map.entries())
    .map(([symbol, name]) => ({ symbol, name }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

async function fetchBinanceAprs(): Promise<AprOpportunity[]> {
  if (!env.BINANCE_API_KEY || !env.BINANCE_API_SECRET) {
    return fetchStaticByPlatform('Binance');
  }

  const query = new URLSearchParams({
    product: 'STAKING',
    status: 'ALL',
    timestamp: Date.now().toString(),
  });

  const signature = crypto
    .createHmac('sha256', env.BINANCE_API_SECRET)
    .update(query.toString())
    .digest('hex');
  query.append('signature', signature);

  const response = await fetch(`https://api.binance.com/sapi/v1/staking/productList?${query.toString()}`, {
    headers: {
      'X-MBX-APIKEY': env.BINANCE_API_KEY,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }

  type BinanceProduct = {
    projectId: string;
    asset: string;
    rewardAsset: string;
    duration: number;
    apr: string;
    status: string;
    deliveryAnnualInterestRate: string;
    redeemPeriod: number;
    productId: string;
  };

  const body = (await response.json()) as BinanceProduct[];
  return body
    .filter((product) => product.status === 'SUBSCRIBABLE')
    .map((product) => ({
      id: `binance-${product.projectId || product.productId}`,
      symbol: product.asset.toUpperCase(),
      asset: product.asset.toUpperCase(),
      platform: 'Binance',
      platformType: 'exchange',
      chain: 'BSC',
      apr: parseFloat(product.apr || product.deliveryAnnualInterestRate || '0') * 100,
      apy: parseFloat(product.deliveryAnnualInterestRate || product.apr || '0') * 100,
      lockPeriod: product.duration > 0 ? `${product.duration} Days` : 'Flexible',
      riskLevel: product.duration > 30 ? 'medium' : 'low',
      source: 'Binance Simple Earn',
      lastUpdated: new Date().toISOString(),
    }));
}

async function fetchStaticByPlatform(platform: string): Promise<AprOpportunity[]> {
  return sampleAprData.filter((row) => row.platform === platform);
}
