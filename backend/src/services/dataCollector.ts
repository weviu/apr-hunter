import { getDatabase } from '../config/database';
import { AprDataDocument } from '../models/AprData';
import crypto from 'crypto';

/**
 * Data Collector Service
 * Fetches real APR/Earn data from crypto exchanges
 * 
 * Supported Exchanges:
 * - OKX (Staking - Authenticated API)
 * - Binance (Simple Earn - Authenticated API)
 * - KuCoin (Earn/Staking - Authenticated API)
 * - Kraken (Staking - Public API)
 * - Aave (DeFi - Public API)
 */

interface DataSource {
  name: string;
  type: 'exchange' | 'defi';
  fetch: () => Promise<AprDataDocument[]>;
}

// Helper to get env vars at runtime (not module load time)
const getEnv = (key: string) => process.env[key] || '';

// OKX API credentials from environment
const getOKXCredentials = () => ({
  apiKey: getEnv('OKX_API_KEY'),
  secretKey: getEnv('OKX_SECRET_KEY'),
  passphrase: getEnv('OKX_PASSPHRASE'),
});

// Binance API credentials from environment
const getBinanceCredentials = () => ({
  apiKey: getEnv('BINANCE_API_KEY'),
  secretKey: getEnv('BINANCE_SECRET_KEY'),
});

// KuCoin API credentials from environment
const getKuCoinCredentials = () => ({
  apiKey: getEnv('KUCOIN_API_KEY'),
  secretKey: getEnv('KUCOIN_SECRET_KEY'),
  passphrase: getEnv('KUCOIN_PASSPHRASE'),
});

// Kraken API credentials (required for private staking endpoints)
const getKrakenCredentials = () => ({
  apiKey: getEnv('KRAKEN_API_KEY'),
  secretKey: getEnv('KRAKEN_SECRET_KEY'),
});

// Helper to make HTTP requests with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'APR-Finder/1.0',
        ...options.headers,
      },
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// OKX API signature generation
function generateOKXSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
  const message = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', getOKXCredentials().secretKey).update(message).digest('base64');
}

// Make authenticated OKX API request
async function okxAuthenticatedRequest(endpoint: string, method: string = 'GET', body?: object): Promise<any> {
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateOKXSignature(timestamp, method, endpoint, bodyStr);
  const creds = getOKXCredentials();
  
  const headers: Record<string, string> = {
    'OK-ACCESS-KEY': creds.apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': creds.passphrase,
    'Content-Type': 'application/json',
  };
  
  const url = `https://www.okx.com${endpoint}`;
  
  const response = await fetchWithTimeout(url, {
    method,
    headers,
    body: bodyStr || undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OKX API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// Binance API signature generation
function generateBinanceSignature(queryString: string): string {
  return crypto.createHmac('sha256', getBinanceCredentials().secretKey).update(queryString).digest('hex');
}

// Make authenticated Binance API request
async function binanceAuthenticatedRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const timestamp = Date.now().toString();
  const queryParams = new URLSearchParams({
    ...params,
    timestamp,
  });
  
  const signature = generateBinanceSignature(queryParams.toString());
  queryParams.append('signature', signature);
  
  const url = `https://api.binance.com${endpoint}?${queryParams.toString()}`;
  
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': getBinanceCredentials().apiKey,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Binance API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// KuCoin API signature generation
function generateKuCoinSignature(timestamp: string, method: string, endpoint: string, body: string = ''): string {
  const message = timestamp + method + endpoint + body;
  return crypto.createHmac('sha256', getKuCoinCredentials().secretKey).update(message).digest('base64');
}

// KuCoin passphrase encryption
function encryptKuCoinPassphrase(): string {
  const creds = getKuCoinCredentials();
  return crypto.createHmac('sha256', creds.secretKey).update(creds.passphrase).digest('base64');
}

// Make authenticated KuCoin API request
async function kucoinAuthenticatedRequest(endpoint: string, method: string = 'GET', body?: object): Promise<any> {
  const timestamp = Date.now().toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateKuCoinSignature(timestamp, method, endpoint, bodyStr);
  const passphrase = encryptKuCoinPassphrase();
  
  const headers: Record<string, string> = {
    'KC-API-KEY': getKuCoinCredentials().apiKey,
    'KC-API-SIGN': signature,
    'KC-API-TIMESTAMP': timestamp,
    'KC-API-PASSPHRASE': passphrase,
    'KC-API-KEY-VERSION': '2',
    'Content-Type': 'application/json',
  };
  
  const url = `https://api.kucoin.com${endpoint}`;
  
  const response = await fetchWithTimeout(url, {
    method,
    headers,
    body: bodyStr || undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KuCoin API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// Make authenticated Kraken API request (private)
async function krakenAuthenticatedRequest(path: string, params: Record<string, string | number> = {}): Promise<any> {
  const creds = getKrakenCredentials();
  if (!creds.apiKey || !creds.secretKey) {
    throw new Error('Kraken API credentials not configured');
  }

  const nonce = (Date.now() * 1000).toString();
  const body = new URLSearchParams({ nonce, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) }).toString();

  const sha256 = crypto.createHash('sha256').update(nonce + body).digest();
  const hmac = crypto.createHmac('sha512', Buffer.from(creds.secretKey, 'base64'))
    .update(path + sha256)
    .digest('base64');

  const response = await fetchWithTimeout(`https://api.kraken.com${path}`, {
    method: 'POST',
    headers: {
      'API-Key': creds.apiKey,
      'API-Sign': hmac,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Kraken API parse error: ${text.slice(0, 200)}`);
  }

  if (!response.ok || (json?.error && json.error.length)) {
    const errMsg = Array.isArray(json?.error) ? json.error.join('; ') : text;
    throw new Error(`Kraken API error: ${response.status} - ${errMsg}`);
  }

  return json;
}

// Bybit integration removed.

// Map common asset symbols
function normalizeAsset(symbol: string): string {
  const mapping: Record<string, string> = {
    'WBTC': 'BTC',
    'WETH': 'ETH',
    'BETH': 'ETH',
    'STETH': 'ETH',
  };
  return mapping[symbol.toUpperCase()] || symbol.toUpperCase();
}

// Get chain from asset
function getChainForAsset(asset: string): string {
  const chainMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'bsc',
    'SOL': 'solana',
    'MATIC': 'polygon',
    'AVAX': 'avalanche',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'ATOM': 'cosmos',
    'XRP': 'ripple',
    'DOGE': 'dogecoin',
    'TRX': 'tron',
    'TON': 'ton',
    'USDT': 'ethereum',
    'USDC': 'ethereum',
  };
  return chainMap[asset.toUpperCase()] || 'ethereum';
}

class DataCollector {
  private sources: DataSource[] = [];
  private krakenBackoffUntil = 0;

  constructor() {
    // Register data sources
    this.sources = [
      {
        name: 'OKX',
        type: 'exchange',
        fetch: this.fetchOKXData.bind(this),
      },
      {
        name: 'Binance',
        type: 'exchange',
        fetch: this.fetchBinanceData.bind(this),
      },
      {
        name: 'KuCoin',
        type: 'exchange',
        fetch: this.fetchKuCoinData.bind(this),
      },
      {
        name: 'Kraken',
        type: 'exchange',
        fetch: this.fetchKrakenData.bind(this),
      },
      {
        name: 'Aave',
        type: 'defi',
        fetch: this.fetchAaveData.bind(this),
      },
    ];
  }

  /**
   * Fetch OKX Simple Earn data using authenticated API
   * This gives us the actual Simple Earn rates (not lending rates)
   */
  private async fetchOKXData(): Promise<AprDataDocument[]> {
    const results: AprDataDocument[] = [];
    
    // Check if API credentials are configured
    const creds = getOKXCredentials();
    if (!creds.apiKey || !creds.secretKey || !creds.passphrase) {
      console.log('[WARN] OKX API credentials not configured, skipping OKX');
      return results;
    }
    
    try {
      console.log('[AUTH] Using authenticated OKX API for Simple Earn rates...');
      
      // Try to get Simple Earn Flexible products
      try {
        const flexibleData = await okxAuthenticatedRequest('/api/v5/finance/savings/balance');
        
        if (flexibleData?.code === '0' && flexibleData?.data) {
          for (const item of flexibleData.data) {
            const asset = normalizeAsset(item.ccy || '');
            if (!asset) continue;
            
            // Get the lending rate for this currency
            const rate = parseFloat(item.lendingRate || item.rate || '0') * 100;
            if (rate <= 0) continue;
            
            results.push({
              asset,
              platform: 'OKX',
        platformType: 'exchange',
              chain: getChainForAsset(asset),
              apr: rate,
              apy: rate,
              minStake: 0,
              lockPeriod: 'Flexible',
        riskLevel: 'low',
        lastUpdated: new Date(),
              source: 'okx_simple_earn',
        createdAt: new Date(),
            });
          }
          console.log(`[OK] Got ${results.length} products from OKX Simple Earn balance`);
        }
      } catch (e: any) {
        console.log('OKX savings balance not available:', e.message);
      }

      // Try staking/DeFi offers
      try {
        const stakingData = await okxAuthenticatedRequest('/api/v5/finance/staking-defi/offers');
        
        if (stakingData?.code === '0' && stakingData?.data) {
          for (const offer of stakingData.data) {
            const asset = normalizeAsset(offer.ccy || '');
            if (!asset) continue;
            
            const apr = parseFloat(offer.apy || offer.rate || '0') * 100;
            if (apr <= 0) continue;
            
            // Check if we already have this asset (avoid duplicates)
            const exists = results.find(r => r.asset === asset && r.lockPeriod === (offer.term === '0' ? 'Flexible' : `${offer.term} days`));
            if (exists) continue;
            
            results.push({
              asset,
              platform: 'OKX',
        platformType: 'exchange',
              chain: getChainForAsset(asset),
              apr,
              apy: apr,
              minStake: parseFloat(offer.minAmt || '0'),
              lockPeriod: offer.term === '0' ? 'Flexible' : `${offer.term} days`,
        riskLevel: 'low',
        lastUpdated: new Date(),
              source: 'okx_earn',
        createdAt: new Date(),
            });
          }
          console.log('[OK] Got staking offers from OKX');
        }
      } catch (e: any) {
        console.log('OKX staking offers not available:', e.message);
      }

      // Only use authenticated staking data - no lending fallback
      if (results.length === 0) {
        console.log('[WARN] No staking products found from OKX API');
      }

    } catch (error: any) {
      console.error('[ERROR] OKX authenticated API error:', error.message);
    }

    return results;
  }

  /**
   * Fetch Binance Simple Earn data using authenticated API
   */
  private async fetchBinanceData(): Promise<AprDataDocument[]> {
    const results: AprDataDocument[] = [];
    
    // Check if API credentials are configured
    const creds = getBinanceCredentials();
    if (!creds.apiKey || !creds.secretKey) {
      console.log('[WARN] Binance API credentials not configured, skipping Binance');
      return results;
    }
    
    try {
      console.log('[AUTH] Using authenticated Binance API for Simple Earn rates...');
      
      // Fetch Flexible Simple Earn products
      try {
        const flexibleData = await binanceAuthenticatedRequest('/sapi/v1/simple-earn/flexible/list', {
          size: '100',
        });
        
        if (flexibleData?.rows && Array.isArray(flexibleData.rows)) {
          for (const product of flexibleData.rows) {
            const asset = normalizeAsset(product.asset || '');
            if (!asset) continue;
            
            // Get the latest APR (annualized rate)
            const apr = parseFloat(product.latestAnnualPercentageRate || product.avgAnnualPercentageRate || '0') * 100;
            if (apr <= 0) continue;
            
            // Skip if we already have a higher rate for this asset
            const existingIndex = results.findIndex(r => r.asset === asset && r.lockPeriod === 'Flexible');
            if (existingIndex >= 0) {
              if (results[existingIndex].apr >= apr) continue;
              results.splice(existingIndex, 1);
            }
            
            results.push({
              asset,
        platform: 'Binance',
        platformType: 'exchange',
              chain: getChainForAsset(asset),
              apr,
              apy: apr,
              minStake: parseFloat(product.minPurchaseAmount || '0'),
              lockPeriod: 'Flexible',
        riskLevel: 'low',
        lastUpdated: new Date(),
              source: 'binance_simple_earn_flexible',
        createdAt: new Date(),
            });
          }
          console.log(`[OK] Got ${results.length} flexible products from Binance Simple Earn`);
        }
      } catch (e: any) {
        console.log('Binance flexible earn not available:', e.message);
      }

      // Fetch Locked Simple Earn products
      try {
        const lockedData = await binanceAuthenticatedRequest('/sapi/v1/simple-earn/locked/list', {
          size: '100',
        });
        
        if (lockedData?.rows && Array.isArray(lockedData.rows)) {
          for (const product of lockedData.rows) {
            const asset = normalizeAsset(product.asset || '');
            if (!asset) continue;
            
            // Get APR from detail or tier rates
            let apr = 0;
            if (product.detail && Array.isArray(product.detail)) {
              // Get the best rate from tiers
              for (const tier of product.detail) {
                const tierApr = parseFloat(tier.apy || tier.annualPercentageRate || '0') * 100;
                if (tierApr > apr) apr = tierApr;
              }
            }
            if (apr <= 0) {
              apr = parseFloat(product.apy || '0') * 100;
            }
            if (apr <= 0) continue;
            
            const duration = product.duration || 'Locked';
            const lockPeriod = typeof duration === 'number' ? `${duration} days` : duration;
            
            results.push({
              asset,
        platform: 'Binance',
        platformType: 'exchange',
              chain: getChainForAsset(asset),
              apr,
              apy: apr,
              minStake: parseFloat(product.minPurchaseAmount || '0'),
              lockPeriod,
        riskLevel: 'low',
        lastUpdated: new Date(),
              source: 'binance_simple_earn_locked',
        createdAt: new Date(),
            });
          }
          console.log(`[OK] Got locked products from Binance Simple Earn`);
        }
      } catch (e: any) {
        console.log('Binance locked earn not available:', e.message);
      }

      if (results.length === 0) {
        console.log('[WARN] No earn products found from Binance API');
      }

    } catch (error: any) {
      console.error('[ERROR] Binance API error:', error.message);
    }

    return results;
  }

  /**
   * Fetch KuCoin earn data using authenticated API
   */
  private async fetchKuCoinData(): Promise<AprDataDocument[]> {
    const results: AprDataDocument[] = [];
    
    // Check if API credentials are configured
    const creds = getKuCoinCredentials();
    if (!creds.apiKey || !creds.secretKey || !creds.passphrase) {
      console.log('[WARN] KuCoin API credentials not configured, skipping KuCoin');
      return results;
    }
    
    try {
      console.log('[AUTH] Using authenticated KuCoin API for earn rates...');
      
      // Try multiple KuCoin Earn endpoints (staking and savings only, no promotions)
      const endpoints = [
        { path: '/api/v3/earn/saving/products', type: 'savings' },
        { path: '/api/v1/earn/saving/products', type: 'savings' },
        { path: '/api/v3/earn/staking/products', type: 'staking' },
        { path: '/api/v1/earn/staking/products', type: 'staking' },
      ];
      
      for (const endpoint of endpoints) {
        try {
          const data = await kucoinAuthenticatedRequest(endpoint.path);
          
          if (data?.code === '200000' && data?.data) {
            const items = Array.isArray(data.data) ? data.data : 
                         (data.data.items ? data.data.items : [data.data]);
            
            // Log first item structure for debugging
            if (items.length > 0 && results.length === 0) {
              const sample = items[0];
              console.log(`[DEBUG] KuCoin ${endpoint.type} sample keys:`, Object.keys(sample).join(', '));
            }
            
            for (const item of items) {
              const asset = normalizeAsset(item.currency || item.coin || item.ccy || '');
              if (!asset) continue;
              
              // Try various APY/APR field names - KuCoin uses many different names
              let apr = 0;
              const apyFields = [
                'recentApy', 'latestInterestRate', 'apy', 'annualInterestRate', 
                'interestRate', 'rate', 'earningRate', 'returnRate', 'yieldRate',
                'apr', 'annualRate', 'baseApy', 'floatApy'
              ];
              
              for (const field of apyFields) {
                if (item[field] !== undefined && item[field] !== null) {
                  let val = item[field];
                  if (typeof val === 'string') {
                    val = val.replace('%', '');
                  }
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed) && parsed > 0) {
                    apr = parsed;
                    break;
                  }
                }
              }
              
              // Convert decimal to percentage if needed (values < 1 are likely decimals)
              if (apr > 0 && apr < 1) apr = apr * 100;
              
              // Skip invalid rates
              if (apr <= 0 || apr > 1000) continue;
              
              const lockPeriod = item.lockDay || item.duration || item.period || item.term
                ? `${item.lockDay || item.duration || item.period || item.term} days` 
                : 'Flexible';
              
              // Skip duplicates - keep highest APR
              const existingIndex = results.findIndex(r => r.asset === asset && r.lockPeriod === lockPeriod && r.platform === 'KuCoin');
              if (existingIndex >= 0) {
                if (results[existingIndex].apr >= apr) continue;
                results.splice(existingIndex, 1);
              }
              
              results.push({
                asset,
                platform: 'KuCoin',
                platformType: 'exchange',
                chain: getChainForAsset(asset),
                apr,
                apy: apr,
                minStake: parseFloat(item.minDepositAmount || item.minStakeAmount || item.minAmount || '0'),
                lockPeriod,
                riskLevel: 'low',
                lastUpdated: new Date(),
                source: `kucoin_${endpoint.type}`,
                createdAt: new Date(),
              });
            }
          }
        } catch (e: any) {
          // Log but continue to next endpoint
          if (!e.message.includes('404') && !e.message.includes('400')) {
            console.log(`KuCoin ${endpoint.type} error:`, e.message);
          }
        }
      }

      if (results.length === 0) {
        console.log('[INFO] KuCoin API returned no earn products - may need "KuCoin Earn" permission');
      } else {
        console.log(`[OK] Got ${results.length} total products from KuCoin`);
      }

    } catch (error: any) {
      console.error('[ERROR] KuCoin API error:', error.message);
    }

    return results;
  }

  /**
   * Fetch Kraken staking data (public API)
   */
  private async fetchKrakenData(): Promise<AprDataDocument[]> {
    const results: AprDataDocument[] = [];
    try {
      if (Date.now() < this.krakenBackoffUntil) {
        console.log('[INFO] Skipping Kraken due to temporary lockout backoff');
        return results;
      }
      if (!KRAKEN_API_KEY || !KRAKEN_SECRET_KEY) {
        console.warn('[WARN] Kraken API credentials not configured, skipping Kraken');
        return results;
      }

      // Kraken Earn strategies (staking successor)
      const json = await krakenAuthenticatedRequest('/0/private/Earn/Strategies');
      const rawStrategies = json?.result || [];
      const strategies = Array.isArray(rawStrategies) ? rawStrategies : Object.values(rawStrategies);

      for (const item of strategies) {
        const asset = normalizeAsset(
          item.asset || item.assetSymbol || item.altname || item.name || item.staking_asset || item.currency || ''
        );
        const reward = parseFloat(
          item.reward_rate ||
          item.reward ||
          item.apr ||
          item.estimated_reward_rate ||
          item.estimated_apr ||
          item.earn_apr ||
          '0'
        );
        if (!asset || reward <= 0 || Number.isNaN(reward)) continue;

        const lock =
          item.lockup_period ||
          item.min_lock ||
          item.lock_time ||
          item.staking_period ||
          item.duration ||
          item.term ||
          'Flexible';

        results.push({
          asset,
          platform: 'Kraken',
          platformType: 'exchange',
          chain: getChainForAsset(asset),
          apr: reward * 100, // Kraken returns decimal reward_rate
          apy: reward * 100,
          minStake: 0,
          lockPeriod: typeof lock === 'number' ? `${lock} days` : String(lock),
          riskLevel: 'low',
          lastUpdated: new Date(),
          source: 'kraken_staking',
          createdAt: new Date(),
        });
      }
      if (results.length === 0) {
        console.log('[WARN] No staking products found from Kraken API');
      } else {
        console.log(`[OK] Got ${results.length} products from Kraken`);
      }
    } catch (error: any) {
      const message = error?.message || '';
      if (message.includes('Temporary lockout')) {
        this.krakenBackoffUntil = Date.now() + 60_000;
        console.warn('[WARN] Kraken temporary lockout – backing off 60s');
      }
      console.error('[ERROR] Kraken API error:', error.message);
    }
    return results;
  }

  /**
   * Fetch Aave supply rates (public API)
   */
  private async fetchAaveData(): Promise<AprDataDocument[]> {
    const results: AprDataDocument[] = [];
    try {
      // Aave v3 markets data (mainnet) – try network param first, then fallback
      const urls = [
        'https://aave-api-v3.aave.com/data/markets-data?network=ethereum',
        'https://aave-api-v3.aave.com/data/markets-data',
        'https://aave-api-v2.aave.com/data/markets-data',
      ];

      let data: any = null;
      let lastError: string | null = null;

      for (const url of urls) {
        try {
          const res = await fetchWithTimeout(url, {
            headers: {
              Accept: 'application/json',
            },
          });
          const text = await res.text();
          try {
            data = JSON.parse(text);
            lastError = null;
            break;
          } catch {
            lastError = `Aave API parse error from ${url}: ${text.slice(0, 200)}`;
          }
        } catch (err: any) {
          lastError = `Aave API fetch error from ${url}: ${err?.message || err}`;
        }
      }

      if (!data) {
        throw new Error(lastError || 'Aave API returned no data');
      }

      const markets = Array.isArray(data) ? data : data?.markets || [];
      for (const m of markets) {
        const asset = normalizeAsset(m?.symbol || m?.underlyingAsset || '');
        const liquidityRate = parseFloat(m?.liquidityRate || '0'); // ray
        if (!asset || liquidityRate <= 0) continue;
        const apr = (liquidityRate / 1e27) * 100; // convert from ray to percent
        if (apr <= 0 || apr > 500) continue;
        results.push({
          asset,
          platform: 'Aave',
          platformType: 'defi',
          chain: getChainForAsset(asset),
          apr,
          apy: apr,
          minStake: 0,
          lockPeriod: 'Flexible',
          riskLevel: 'low',
          lastUpdated: new Date(),
          source: 'aave_supply',
          createdAt: new Date(),
        });
      }
      if (results.length === 0) {
        console.log('[WARN] No supply products found from Aave API');
      } else {
        console.log(`[OK] Got ${results.length} products from Aave`);
      }
    } catch (error: any) {
      console.error('[ERROR] Aave API error:', error.message);
    }
    return results;
  }

  /**
   * Collect data from all sources
   */
  async collectAll(): Promise<{ success: number; failed: number; errors: string[] }> {
    const db = getDatabase();
    const aprCollection = db.collection<AprDataDocument>('apr_data');
    const historyCollection = db.collection('apr_history');

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const source of this.sources) {
      try {
        console.log(`[FETCH] Fetching data from ${source.name}...`);
        const data = await source.fetch();

        // Save current data and create history records
        for (const item of data) {
          // Find existing record
          const existing = await aprCollection.findOne({
            asset: item.asset,
            platform: item.platform,
            chain: item.chain,
            lockPeriod: item.lockPeriod,
          });

          // Save to history if APR changed
          if (existing && existing.apr !== item.apr) {
            await historyCollection.insertOne({
              asset: item.asset,
              platform: item.platform,
              chain: item.chain,
              apr: existing.apr,
              apy: existing.apy,
              timestamp: existing.lastUpdated,
              createdAt: new Date(),
            });
          }

          // Upsert current data
          await aprCollection.updateOne(
            {
              asset: item.asset,
              platform: item.platform,
              chain: item.chain,
              lockPeriod: item.lockPeriod,
            },
            {
              $set: {
                ...item,
                lastUpdated: new Date(),
              },
            },
            { upsert: true }
          );
        }

        success++;
        console.log(`[OK] Successfully collected ${data.length} products from ${source.name}`);
      } catch (error: any) {
        failed++;
        const errorMsg = `Failed to fetch from ${source.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[ERROR] ${errorMsg}`);
      }
    }

    return { success, failed, errors };
  }
}

export const dataCollector = new DataCollector();
