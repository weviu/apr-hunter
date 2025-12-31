import crypto from 'node:crypto';
import { env } from '@/lib/env';

export interface CexHolding {
  symbol: string;
  asset: string;
  amount: number;
  platform: string;
  platformType: 'exchange';
  chain?: string;
}

abstract class CexAdapter {
  abstract fetchHoldings(apiKey: string, apiSecret: string, passphrase?: string): Promise<CexHolding[]>;
  abstract getName(): string;
}

class BinanceAdapter extends CexAdapter {
  getName(): string {
    return 'Binance';
  }

  private generateSignature(queryString: string, secretKey: string): string {
    return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
  }

  private async authenticatedRequest<T>(endpoint: string, params: Record<string, string>, apiKey: string, secretKey: string): Promise<T> {
    const timestamp = Date.now().toString();
    const queryParams = new URLSearchParams({ ...params, timestamp });
    const signature = this.generateSignature(queryParams.toString(), secretKey);
    queryParams.append('signature', signature);

    const response = await fetch(`https://api.binance.com${endpoint}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Binance API error ${response.status}: ${err}`);
    }

    return response.json() as Promise<T>;
  }

  async fetchHoldings(apiKey: string, apiSecret: string, passphrase?: string): Promise<CexHolding[]> {
    if (!apiKey || !apiSecret) {
      throw new Error('Binance credentials missing');
    }

    try {
      const response = await this.authenticatedRequest<{
        balances: Array<{
          asset: string;
          free: string;
          locked: string;
        }>;
      }>('/api/v3/account', {}, apiKey, apiSecret);

      const holdings: CexHolding[] = [];

      for (const balance of response.balances) {
        const amount = parseFloat(balance.free) + parseFloat(balance.locked);
        if (amount > 0) {
          holdings.push({
            symbol: balance.asset.toUpperCase(),
            asset: balance.asset.toUpperCase(),
            amount,
            platform: 'Binance',
            platformType: 'exchange',
          });
        }
      }

      return holdings;
    } catch (error) {
      console.error('Binance holdings fetch error:', error);
      throw error;
    }
  }
}

class OkxAdapter extends CexAdapter {
  getName(): string {
    return 'OKX';
  }

  private generateSignature(timestamp: string, method: string, requestPath: string, secretKey: string, body = ''): string {
    const message = timestamp + method + requestPath + body;
    return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
  }

  private async authenticatedRequest<T>(requestPath: string, method = 'GET', apiKey: string, secretKey: string, passphrase: string, body?: object): Promise<T> {
    const timestamp = new Date().toISOString();
    const bodyStr = body ? JSON.stringify(body) : '';
    const signature = this.generateSignature(timestamp, method, requestPath, secretKey, bodyStr);

    const response = await fetch(`https://www.okx.com${requestPath}`, {
      method,
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
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

  async fetchHoldings(apiKey: string, apiSecret: string, passphrase?: string): Promise<CexHolding[]> {
    if (!apiKey || !apiSecret || !passphrase) {
      throw new Error('OKX credentials missing');
    }

    try {
      const response = await this.authenticatedRequest<{
        data: Array<{
          details: Array<{
            ccy: string;
            cashBal: string;
          }>;
        }>;
      }>('/api/v5/account/balance', 'GET', apiKey, apiSecret, passphrase);

      const holdings: CexHolding[] = [];

      if (response.data && Array.isArray(response.data)) {
        for (const account of response.data) {
          for (const detail of account.details || []) {
            const amount = parseFloat(detail.cashBal || '0');
            if (amount > 0) {
              holdings.push({
                symbol: detail.ccy.toUpperCase(),
                asset: detail.ccy.toUpperCase(),
                amount,
                platform: 'OKX',
                platformType: 'exchange',
              });
            }
          }
        }
      }

      return holdings;
    } catch (error) {
      console.error('OKX holdings fetch error:', error);
      throw error;
    }
  }
}

class KuCoinAdapter extends CexAdapter {
  getName(): string {
    return 'KuCoin';
  }

  private generateSignature(timestamp: string, method: string, endpoint: string, secretKey: string, body = ''): string {
    const payload = timestamp + method + endpoint + body;
    return crypto.createHmac('sha256', secretKey).update(payload).digest('base64');
  }

  private encryptPassphrase(secretKey: string, passphrase: string): string {
    // KuCoin API now requires raw passphrase, not encrypted
    return passphrase;
  }

  private async authenticatedRequest<T>(endpoint: string, apiKey: string, secretKey: string, passphrase: string, method = 'GET', body?: object): Promise<T> {
    const timestamp = Date.now().toString();
    const bodyStr = body ? JSON.stringify(body) : '';
    const signature = this.generateSignature(timestamp, method, endpoint, secretKey, bodyStr);
    const encryptedPassphrase = this.encryptPassphrase(secretKey, passphrase);

    const response = await fetch(`https://api.kucoin.com${endpoint}`, {
      method,
      headers: {
        'KC-API-SIGN': signature,
        'KC-API-TIMESTAMP': timestamp,
        'KC-API-KEY': apiKey,
        'KC-API-PASSPHRASE': encryptedPassphrase,
        'Content-Type': 'application/json',
      },
      body: bodyStr || undefined,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[KuCoin] API error: ${response.status}`, err);
      throw new Error(`KuCoin API error ${response.status}: ${err}`);
    }

    return response.json() as Promise<T>;
  }

  async fetchHoldings(apiKey: string, apiSecret: string, passphrase?: string): Promise<CexHolding[]> {
    if (!apiKey || !apiSecret || !passphrase) {
      throw new Error('KuCoin credentials missing');
    }

    try {
      const response = await this.authenticatedRequest<{
        data: Array<{
          currency: string;
          available: string;
          held: string;
        }>;
      }>('/api/v1/accounts', apiKey, apiSecret, passphrase, 'GET');

      const holdings: CexHolding[] = [];

      if (response.data && Array.isArray(response.data)) {
        for (const account of response.data) {
          const amount = parseFloat(account.available || '0') + parseFloat(account.held || '0');
          if (amount > 0) {
            holdings.push({
              symbol: account.currency.toUpperCase(),
              asset: account.currency.toUpperCase(),
              amount,
              platform: 'KuCoin',
              platformType: 'exchange',
            });
          }
        }
      }

      return holdings;
    } catch (error) {
      console.error('KuCoin holdings fetch error:', error);
      throw error;
    }
  }
}

export function getExchangeAdapter(exchange: string): CexAdapter {
  switch (exchange.toLowerCase()) {
    case 'binance':
      return new BinanceAdapter();
    case 'okx':
      return new OkxAdapter();
    case 'kucoin':
      return new KuCoinAdapter();
    default:
      throw new Error(`Unsupported exchange: ${exchange}`);
  }
}

export const SUPPORTED_EXCHANGES = ['Binance', 'OKX', 'KuCoin'];
