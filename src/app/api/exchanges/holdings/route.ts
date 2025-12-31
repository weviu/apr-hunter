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

    // Fetch holdings using user's keys
    const adapter = getExchangeAdapter(exchange);
    let holdings;

    try {
      holdings = await adapter.fetchHoldings(userKeys.apiKey, userKeys.apiSecret, userKeys.passphrase);
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

    return NextResponse.json({
      success: true,
      data: {
        exchange,
        holdings,
      },
    });
  } catch (error) {
    console.error(`Error fetching ${req.nextUrl.searchParams.get('exchange')} holdings:`, error);
    const message = error instanceof Error ? error.message : 'Failed to fetch holdings';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
