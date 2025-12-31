import { getMongoDb } from '@/lib/db/mongodb';
import { getExchangeAdapter, SUPPORTED_EXCHANGES } from '@/lib/exchanges/cex-adapter';
import { NextRequest, NextResponse } from 'next/server';
import { getUserExchangeKeys } from '@/app/api/settings/exchange-keys/route';

// GET /api/exchanges
// List supported exchanges
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const exchange = searchParams.get('exchange');

  // If exchange specified, fetch holdings from that exchange
  if (exchange) {
    return handleFetchHoldings(req, exchange);
  }

  // Otherwise, return list of supported exchanges
  return NextResponse.json({
    success: true,
    data: {
      exchanges: SUPPORTED_EXCHANGES,
    },
  });
}

async function handleFetchHoldings(req: NextRequest, exchange: string) {
  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'No authorization token provided. Please log in.' 
      }, { status: 401 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ sessionToken: token });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Session expired or invalid. Please log in again.' 
      }, { status: 401 });
    }

    // Get user's API keys for this exchange
    const userKeys = await getUserExchangeKeys(user._id.toString(), exchange, db);
    
    if (!userKeys) {        
      return NextResponse.json(
        { 
          success: false, 
          message: `${exchange} not configured. Please add your API keys in Settings.`,
          code: 'NO_KEYS',
        },
        { status: 401 }
      );
    }

    // Get adapter for the exchange
    const adapter = getExchangeAdapter(exchange);

    // Fetch holdings from exchange API using user's keys
    try {
      const holdings = await adapter.fetchHoldings(userKeys.apiKey, userKeys.apiSecret, userKeys.passphrase);

      return NextResponse.json({
        success: true,
        data: {
          exchange: adapter.getName(),
          holdings,
        },
      });
    } catch (error) {
      console.error(`Failed to fetch ${exchange} holdings:`, error);
      
      // Check if it's an auth error
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('401') || errorMessage.includes('Invalid') || errorMessage.includes('Unauthorized')) {
        return NextResponse.json(
          { 
            success: false, 
            message: `${exchange} authentication failed. Check your API keys in Settings.`,
            code: 'AUTH_FAILED',
          },
          { status: 401 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error('Error fetching exchange holdings:', error);

    // Handle specific error cases
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('credentials missing')) {
      return NextResponse.json(
        {
          success: false,
          message: `${exchange} API credentials not configured`,
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes('API error')) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to fetch holdings from ${exchange}: ${errorMessage}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
