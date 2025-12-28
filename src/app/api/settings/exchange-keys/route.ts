import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';
import crypto from 'crypto';

interface ExchangeKeysBody {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

// Encryption using AES-256-CBC
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'apr-hunter-default-key-change-in-production';

function encryptKey(key: string): string {
  try {
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch {
    // Fallback to base64 if crypto fails
    return Buffer.from(key).toString('base64');
  }
}

function decryptKey(encrypted: string): string {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Fallback from base64
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }
}

// Validate API keys by making a test request to the exchange
async function validateApiKeys(exchange: string, apiKey: string, apiSecret: string, passphrase?: string): Promise<boolean> {
  try {
    if (exchange.toUpperCase() === 'OKX') {
      // Test OKX API with a simple read request
      const timestamp = new Date().toISOString();
      const message = timestamp + 'GET' + '/api/v5/account/balance';
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(message)
        .digest('base64');

      const response = await fetch('https://www.okx.com/api/v5/account/balance', {
        method: 'GET',
        headers: {
          'OK-ACCESS-KEY': apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': passphrase || '',
        },
      });

      // If we get a 401, the credentials are invalid
      if (response.status === 401) {
        return false;
      }
      // If we get a 200 or other 2xx, credentials are valid
      return response.ok;
    } else if (exchange.toUpperCase() === 'BINANCE') {
      // Test Binance API with a simple read request
      const timestamp = Date.now().toString();
      const queryString = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');

      const response = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      });

      if (response.status === 401) {
        return false;
      }
      return response.ok;
    } else if (exchange.toUpperCase() === 'KUCOIN') {
      // Test KuCoin API with a simple read request
      const timestamp = Date.now().toString();
      const endpoint = '/api/v1/accounts';
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(timestamp + 'GET' + endpoint)
        .digest('base64');
      const encryptedPassphrase = crypto
        .createHmac('sha256', apiSecret)
        .update(passphrase || '')
        .digest('base64');

      const response = await fetch(`https://api.kucoin.com${endpoint}`, {
        method: 'GET',
        headers: {
          'KC-API-SIGN': signature,
          'KC-API-TIMESTAMP': timestamp,
          'KC-API-KEY': apiKey,
          'KC-API-PASSPHRASE': encryptedPassphrase,
        },
      });

      if (response.status === 401) {
        return false;
      }
      return response.ok;
    }

    return true;
  } catch (error) {
    console.error(`Error validating ${exchange} API keys:`, error);
    return false;
  }
}

// GET /api/settings/exchange-keys
// Fetch user's stored exchange API keys (returns only metadata, not actual keys)
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    const user = await db.collection('users').findOne({ sessionToken: token });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
    }

    // Return metadata only (not the actual keys)
    const exchangeKeys = user.exchangeKeys || {};
    const metadata = Object.entries(exchangeKeys).reduce((acc, [exchange, keys]: [string, any]) => {
      acc[exchange] = {
        configured: !!keys?.apiKey,
        lastUpdated: keys?.lastUpdated || null,
      };
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: metadata,
    });
  } catch (error: any) {
    console.error('Error fetching exchange keys metadata:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch keys' }, { status: 500 });
  }
}

// POST /api/settings/exchange-keys
// Save user's exchange API keys (encrypted)
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    const body = (await req.json()) as ExchangeKeysBody;
    const { exchange, apiKey, apiSecret, passphrase } = body;

    if (!exchange || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'Exchange, apiKey, and apiSecret are required' },
        { status: 400 }
      );
    }

    const user = await db.collection('users').findOne({ sessionToken: token });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
    }

    // Validate API keys before saving
    console.log(`Validating ${exchange} API keys...`);
    const isValid = await validateApiKeys(exchange, apiKey, apiSecret, passphrase);
    
    if (!isValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid ${exchange} API credentials. Please check your API Key, Secret, and Passphrase (if required). Make sure read-only permissions are enabled.`,
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // Encrypt the keys before storing
    const encryptedKeys = {
      apiKey: encryptKey(apiKey),
      apiSecret: encryptKey(apiSecret),
      ...(passphrase && { passphrase: encryptKey(passphrase) }),
      lastUpdated: new Date().toISOString(),
    };

    // Update user document with encrypted keys
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          [`exchangeKeys.${exchange}`]: encryptedKeys,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `${exchange} API keys saved successfully`,
      data: {
        exchange,
        configured: true,
      },
    });
  } catch (error: any) {
    console.error('Error saving exchange keys:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to save keys' }, { status: 500 });
  }
}

// DELETE /api/settings/exchange-keys?exchange=OKX
// Remove user's exchange API keys
export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    const exchange = req.nextUrl.searchParams.get('exchange');
    if (!exchange) {
      return NextResponse.json({ success: false, message: 'Exchange parameter required' }, { status: 400 });
    }

    const user = await db.collection('users').findOne({ sessionToken: token });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
    }

    // Remove the exchange keys
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $unset: {
          [`exchangeKeys.${exchange}`]: 1,
        },
        $set: {
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `${exchange} API keys removed successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting exchange keys:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete keys' }, { status: 500 });
  }
}

// Helper function to retrieve decrypted keys (internal use only)
export async function getUserExchangeKeys(userId: any, exchange: string, db: any) {
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user?.exchangeKeys?.[exchange]) {
    return null;
  }

  const encrypted = user.exchangeKeys[exchange];
  return {
    apiKey: decryptKey(encrypted.apiKey),
    apiSecret: decryptKey(encrypted.apiSecret),
    passphrase: encrypted.passphrase ? decryptKey(encrypted.passphrase) : undefined,
  };
}

export { encryptKey, decryptKey };
