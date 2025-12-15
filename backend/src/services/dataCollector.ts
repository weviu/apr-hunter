import { getDatabase } from '../config/database';
import { AprDataDocument } from '../models/AprData';
import crypto from 'crypto';

/**
 * Data Collector Service
 * Fetches real APR/Earn data from crypto exchanges
 * 
 * Supported Exchanges:
 * - OKX (Simple Earn - Authenticated API)
 */

interface DataSource {
  name: string;
  type: 'exchange' | 'defi';
  fetch: () => Promise<AprDataDocument[]>;
}

// OKX API credentials from environment
const OKX_API_KEY = process.env.OKX_API_KEY || '';
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY || '';
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE || '';

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
  return crypto.createHmac('sha256', OKX_SECRET_KEY).update(message).digest('base64');
}

// Make authenticated OKX API request
async function okxAuthenticatedRequest(endpoint: string, method: string = 'GET', body?: object): Promise<any> {
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateOKXSignature(timestamp, method, endpoint, bodyStr);
  
  const headers: Record<string, string> = {
    'OK-ACCESS-KEY': OKX_API_KEY,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': OKX_PASSPHRASE,
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

  constructor() {
    // Register data sources - OKX with authenticated API
    this.sources = [
      {
        name: 'OKX',
        type: 'exchange',
        fetch: this.fetchOKXData.bind(this),
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
    if (!OKX_API_KEY || !OKX_SECRET_KEY || !OKX_PASSPHRASE) {
      console.log('[WARN] OKX API credentials not configured, using public API fallback');
      return this.fetchOKXPublicData();
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
