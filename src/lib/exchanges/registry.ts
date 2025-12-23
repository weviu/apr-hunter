import crypto from 'node:crypto';
import { env } from '@/lib/env';
import { sampleAprData } from '@/lib/data/sampleAprRates';
import { AprOpportunity } from '@/types/apr';

type HttpMethod = 'GET' | 'POST';

type OkxCredentials = {
  apiKey?: string;
  secretKey?: string;
  passphrase?: string;
};

type KucoinCredentials = {
  apiKey?: string;
  secretKey?: string;
  passphrase?: string;
};

function getOkxCredentials(): OkxCredentials {
  return {
    apiKey: env.OKX_API_KEY,
    secretKey: env.OKX_API_SECRET,
    passphrase: env.OKX_PASSPHRASE,
  };
}

function getKucoinCredentials(): KucoinCredentials {
  return {
    apiKey: env.KUCOIN_API_KEY,
    secretKey: env.KUCOIN_API_SECRET,
    passphrase: env.KUCOIN_PASSPHRASE,
  };
}

function generateOkxSignature(timestamp: string, method: HttpMethod, requestPath: string, body = '') {
  const message = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', getOkxCredentials().secretKey || '').update(message).digest('base64');
}

async function okxAuthenticatedRequest<T>(requestPath: string, method: HttpMethod = 'GET', body?: object): Promise<T> {
  const creds = getOkxCredentials();
  if (!creds.apiKey || !creds.secretKey || !creds.passphrase) {
    throw new Error('OKX credentials missing');
  }

  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateOkxSignature(timestamp, method, requestPath, bodyStr);

  const response = await fetch(`https://www.okx.com${requestPath}`, {
    method,
    headers: {
      'OK-ACCESS-KEY': creds.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': creds.passphrase,
      'Content-Type': 'application/json',
    },
    body: bodyStr || undefined,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OKX API error ${response.status}: ${err}`);
  }

  return response.json() as Promise<T>;
}

function generateKucoinSignature(timestamp: string, method: HttpMethod, endpoint: string, body = '') {
  const payload = timestamp + method + endpoint + body;
  return crypto.createHmac('sha256', getKucoinCredentials().secretKey || '').update(payload).digest('base64');
}

function encryptKucoinPassphrase() {
  const creds = getKucoinCredentials();
  return crypto.createHmac('sha256', creds.secretKey || '').update(creds.passphrase || '').digest('base64');
}

async function kucoinAuthenticatedRequest<T>(endpoint: string, method: HttpMethod = 'GET', body?: object): Promise<T> {
  const creds = getKucoinCredentials();
  if (!creds.apiKey || !creds.secretKey || !creds.passphrase) {
    throw new Error('KuCoin credentials missing');
  }

  const timestamp = Date.now().toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateKucoinSignature(timestamp, method, endpoint, bodyStr);
  const passphrase = encryptKucoinPassphrase();

  const response = await fetch(`https://api.kucoin.com${endpoint}`, {
    method,
    headers: {
      'KC-API-KEY': creds.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': passphrase,
      'KC-API-KEY-VERSION': '2',
      'Content-Type': 'application/json',
    },
    body: bodyStr || undefined,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`KuCoin API error ${response.status}: ${err}`);
  }

  return response.json() as Promise<T>;
}

type Connector = {
  id: string;
  label: string;
  fetcher: () => Promise<AprOpportunity[]>;
};

const connectors: Connector[] = [
  { id: 'binance', label: 'Binance Simple Earn', fetcher: fetchBinanceAprs },
  { id: 'okx', label: 'OKX Earn', fetcher: fetchOkxAprs },
  { id: 'kucoin', label: 'KuCoin Earn', fetcher: fetchKucoinAprs },
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

function getChainForAsset(asset: string) {
  const mapping: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'bsc',
    SOL: 'solana',
    MATIC: 'polygon',
    AVAX: 'avalanche',
    ADA: 'cardano',
    DOT: 'polkadot',
    ATOM: 'cosmos',
    XRP: 'ripple',
    DOGE: 'dogecoin',
    TRX: 'tron',
    TON: 'ton',
    USDT: 'ethereum',
    USDC: 'ethereum',
  };
  return mapping[asset.toUpperCase()] || 'ethereum';
}

async function fetchOkxAprs(): Promise<AprOpportunity[]> {
  const creds = getOkxCredentials();
  if (!creds.apiKey || !creds.secretKey || !creds.passphrase) {
    return fetchStaticByPlatform('OKX');
  }

  const results: AprOpportunity[] = [];

  try {
    // Flexible balance (Simple Earn)
    const balance = await okxAuthenticatedRequest<{ code: string; data?: any[] }>('/api/v5/finance/savings/balance');
    if (balance?.code === '0' && Array.isArray(balance.data)) {
      for (const item of balance.data) {
        const asset = (item.ccy || '').toUpperCase();
        const rate = parseFloat(item.lendingRate || item.rate || '0') * 100;
        if (!asset || rate <= 0) continue;
        results.push({
          id: `okx-flex-${asset}`,
          symbol: asset,
          asset,
          platform: 'OKX',
          platformType: 'exchange',
          chain: getChainForAsset(asset),
          apr: rate,
          apy: rate,
          lockPeriod: 'Flexible',
          riskLevel: 'low',
          source: 'okx_simple_earn',
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    // swallow and fall through to other endpoints / static
  }

  try {
    // Staking / DeFi offers
    const staking = await okxAuthenticatedRequest<{ code: string; data?: any[] }>('/api/v5/finance/staking-defi/offers');
    if (staking?.code === '0' && Array.isArray(staking.data)) {
      for (const offer of staking.data) {
        const asset = (offer.ccy || '').toUpperCase();
        const apr = parseFloat(offer.apy || offer.rate || '0') * 100;
        if (!asset || apr <= 0) continue;
        const term = offer.term === '0' || offer.term === 0 ? 'Flexible' : `${offer.term} days`;
        // avoid duplicate lock periods
        if (results.find((r) => r.asset === asset && r.lockPeriod === term && r.platform === 'OKX')) {
          continue;
        }
        results.push({
          id: `okx-${asset}-${term}`,
          symbol: asset,
          asset,
          platform: 'OKX',
          platformType: 'exchange',
          chain: getChainForAsset(asset),
          apr,
          apy: apr,
          lockPeriod: term,
          riskLevel: 'low',
          source: 'okx_earn',
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    // ignore and fallback
  }

  return results.length > 0 ? results : fetchStaticByPlatform('OKX');
}

async function fetchKucoinAprs(): Promise<AprOpportunity[]> {
  const creds = getKucoinCredentials();
  if (!creds.apiKey || !creds.secretKey || !creds.passphrase) {
    return fetchStaticByPlatform('KuCoin');
  }

  const results: AprOpportunity[] = [];
  const endpoints = [
    { path: '/api/v3/earn/saving/products', type: 'savings' },
    { path: '/api/v1/earn/saving/products', type: 'savings' },
    { path: '/api/v3/earn/staking/products', type: 'staking' },
    { path: '/api/v1/earn/staking/products', type: 'staking' },
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await kucoinAuthenticatedRequest<{ code: string; data?: any }>(endpoint.path);
      if (data?.code !== '200000' || !data.data) continue;

      const items = Array.isArray(data.data) ? data.data : data.data.items || [];

      for (const item of items) {
        const asset = (item.currency || item.coin || item.ccy || '').toUpperCase();
        if (!asset) continue;

        const apyFields = [
          'recentApy',
          'latestInterestRate',
          'apy',
          'annualInterestRate',
          'interestRate',
          'rate',
          'earningRate',
          'returnRate',
          'yieldRate',
          'apr',
          'annualRate',
          'baseApy',
          'floatApy',
        ];

        let apr = 0;
        for (const field of apyFields) {
          if (item[field] === undefined || item[field] === null) continue;
          const val = typeof item[field] === 'string' ? item[field].replace('%', '') : item[field];
          const parsed = parseFloat(val);
          if (!Number.isNaN(parsed) && parsed > 0) {
            apr = parsed;
            break;
          }
        }
        if (apr > 0 && apr < 1) apr = apr * 100;
        if (apr <= 0 || apr > 1000) continue;

        const lockPeriodRaw = item.lockDay || item.duration || item.period || item.term;
        const lockPeriod = lockPeriodRaw ? `${lockPeriodRaw} days` : 'Flexible';

        const existing = results.findIndex((r) => r.asset === asset && r.lockPeriod === lockPeriod && r.platform === 'KuCoin');
        if (existing >= 0) {
          if (results[existing].apr >= apr) continue;
          results.splice(existing, 1);
        }

        results.push({
          id: `kucoin-${asset}-${lockPeriod}`,
          symbol: asset,
          asset,
          platform: 'KuCoin',
          platformType: 'exchange',
          chain: getChainForAsset(asset),
          apr,
          apy: apr,
          minStake: parseFloat(item.minDepositAmount || item.minStakeAmount || item.minAmount || '0'),
          lockPeriod,
          riskLevel: 'low',
          source: `kucoin_${endpoint.type}`,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch {
      // continue to next endpoint
    }
  }

  return results.length > 0 ? results : fetchStaticByPlatform('KuCoin');
}
