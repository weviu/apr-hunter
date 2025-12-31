import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getExchangeAdapter } from '@/lib/exchanges/cex-adapter-oauth';

// GET /api/exchanges/connected
// Get list of exchanges user has connected via OAuth
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

    const exchangeTokens = user.exchangeTokens || {};
    const connectedExchanges = Object.keys(exchangeTokens).filter((ex) => {
      const token = exchangeTokens[ex];
      // Check if token is still valid (not expired)
      return token?.accessToken && (!token?.expiresAt || token.expiresAt > Date.now());
    });

    return NextResponse.json({
      success: true,
      data: {
        connected: connectedExchanges,
        all: ['Binance', 'OKX', 'KuCoin'],
      },
    });
  } catch (error) {
    console.error('Error fetching connected exchanges:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch connected exchanges';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE /api/exchanges/connected?exchange=Binance
// Disconnect an exchange
export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const exchange = req.nextUrl.searchParams.get('exchange');
    if (!exchange) {
      return NextResponse.json({ success: false, message: 'Exchange parameter required' }, { status: 400 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    const user = await db.collection('users').findOne({ sessionToken: token });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
    }

    // Remove exchange token
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $unset: {
          [`exchangeTokens.${exchange}`]: 1,
        },
        $set: {
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `${exchange} disconnected successfully`,
    });
  } catch (error) {
    console.error('Error disconnecting exchange:', error);
    const message = error instanceof Error ? error.message : 'Failed to disconnect exchange';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
