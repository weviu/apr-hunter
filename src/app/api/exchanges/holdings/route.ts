import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';
import { getExchangeAdapter } from '@/lib/exchanges/cex-adapter';
import { getUserExchangeKeys } from '@/app/api/settings/exchange-keys/route';

// GET /api/exchanges/holdings?exchange=OKX
// Fetch holdings from user's exchange (uses user's keys if provided, falls back to app keys)
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const exchange = req.nextUrl.searchParams.get('exchange');
    if (!exchange) {
      return NextResponse.json(
        { success: false, message: 'Exchange parameter required' },
        { status: 400 }
      );
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    // Verify user
    const user = await db.collection('users').findOne({ sessionToken: token });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
    }

    // Check if user has provided their own API keys
    const userKeys = await getUserExchangeKeys(user._id, exchange, db);
    
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

    // Fetch holdings using user's keys
    const adapter = getExchangeAdapter(exchange);
    let holdings;

    try {
      holdings = await adapter.fetchHoldings(userKeys.apiKey, userKeys.apiSecret, userKeys.passphrase);
    } catch (error: any) {
      console.error(`Failed to fetch ${exchange} holdings:`, error);
      
      // Check if it's an auth error
      if (error.message.includes('401') || error.message.includes('Invalid') || error.message.includes('Unauthorized')) {
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

    return NextResponse.json({
      success: true,
      data: {
        exchange,
        holdings,
      },
    });
  } catch (error: any) {
    console.error(`Error fetching ${req.nextUrl.searchParams.get('exchange')} holdings:`, error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
