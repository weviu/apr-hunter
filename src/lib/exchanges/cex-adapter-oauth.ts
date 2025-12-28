import crypto from 'crypto';

export interface CexHolding {
  symbol: string;
  asset: string;
  amount: number;
  platform: string;
  platformType: 'exchange' | 'defi';
  chain?: string;
}

// OAuth access token stored per user/exchange
export interface ExchangeOAuthToken {
  exchange: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

abstract class CexAdapter {
  abstract fetchHoldings(accessToken: string): Promise<CexHolding[]>;
  abstract getName(): string;
  abstract getOAuthUrl(clientId: string, redirectUri: string, state: string): string;
  abstract exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }>;
}

class BinanceAdapter extends CexAdapter {
  private clientId = process.env.BINANCE_OAUTH_CLIENT_ID || '';

  getName(): string {
    return 'Binance';
  }

  getOAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: 'wallet', // Binance uses 'wallet' scope for account access
    });
    return `https://accounts.binance.com/en/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    const response = await fetch('https://accounts.binance.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Binance OAuth error: ${err}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async fetchHoldings(accessToken: string): Promise<CexHolding[]> {
    try {
      const response = await fetch('https://api.binance.com/sapi/v1/account', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Binance API error ${response.status}: ${err}`);
      }

      const data = (await response.json()) as {
        balances: Array<{
          asset: string;
          free: string;
          locked: string;
        }>;
      };

      const holdings: CexHolding[] = [];

      for (const balance of data.balances) {
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
    } catch (error: any) {
      console.error('Binance holdings fetch error:', error);
      throw error;
    }
  }
}

class OkxAdapter extends CexAdapter {
  getName(): string {
    return 'OKX';
  }

  getOAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'read:account',
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.okx.com/en/account/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    const response = await fetch('https://www.okx.com/api/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OKX OAuth error: ${err}`);
    }

    const data = await response.json();
    return {
      accessToken: data.data[0].access_token,
      refreshToken: data.data[0].refresh_token,
      expiresIn: data.data[0].expires_in,
    };
  }

  async fetchHoldings(accessToken: string): Promise<CexHolding[]> {
    try {
      const response = await fetch('https://www.okx.com/api/v5/account/balance', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OKX API error ${response.status}: ${err}`);
      }

      const data = (await response.json()) as {
        data: Array<{
          details: Array<{
            ccy: string;
            availBal: string;
            frozenBal: string;
          }>;
        }>;
      };

      const holdings: CexHolding[] = [];

      if (data.data && data.data.length > 0) {
        for (const detail of data.data[0].details) {
          const amount = parseFloat(detail.availBal) + parseFloat(detail.frozenBal);
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

      return holdings;
    } catch (error: any) {
      console.error('OKX holdings fetch error:', error);
      throw error;
    }
  }
}

class KuCoinAdapter extends CexAdapter {
  getName(): string {
    return 'KuCoin';
  }

  getOAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'general',
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.kucoin.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    const response = await fetch('https://api.kucoin.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`KuCoin OAuth error: ${err}`);
    }

    const data = await response.json();
    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresIn: data.data.expires_in,
    };
  }

  async fetchHoldings(accessToken: string): Promise<CexHolding[]> {
    try {
      const response = await fetch('https://api.kucoin.com/api/v1/accounts', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`KuCoin API error ${response.status}: ${err}`);
      }

      const data = (await response.json()) as {
        data: Array<{
          currency: string;
          available: string;
          holds: string;
        }>;
      };

      const holdings: CexHolding[] = [];

      if (data.data && Array.isArray(data.data)) {
        for (const account of data.data) {
          const amount = parseFloat(account.available) + parseFloat(account.holds);
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
    } catch (error: any) {
      console.error('KuCoin holdings fetch error:', error);
      throw error;
    }
  }
}

const SUPPORTED_EXCHANGES = ['Binance', 'OKX', 'KuCoin'];

function getExchangeAdapter(exchange: string): CexAdapter {
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

export { CexAdapter, BinanceAdapter, OkxAdapter, KuCoinAdapter, getExchangeAdapter, SUPPORTED_EXCHANGES };
