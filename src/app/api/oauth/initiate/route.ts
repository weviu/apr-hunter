import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getMongoDb } from '@/lib/db/mongodb';
import { getExchangeAdapter } from '@/lib/exchanges/cex-adapter-oauth';

// POST /api/oauth/initiate
// Start OAuth flow - returns redirect URL to exchange
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as { exchange: string };
    const { exchange } = body;

    if (!exchange) {
      return NextResponse.json({ success: false, message: 'Exchange parameter required' }, { status: 400 });
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

    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    await db.collection('oauth_states').insertOne({
      state,
      userId: user._id.toString(),
      exchange,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Get adapter and OAuth URL
    const adapter = getExchangeAdapter(exchange);
    const clientId = getOAuthClientId(exchange);

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: `OAuth not configured for ${exchange}` },
        { status: 500 }
      );
    }

    const redirectUri = `${req.nextUrl.origin}/api/oauth/callback`;
    const oauthUrl = adapter.getOAuthUrl(clientId, redirectUri, state);

    return NextResponse.json({
      success: true,
      data: {
        redirectUrl: oauthUrl,
      },
    });
  } catch (error: any) {
    console.error('OAuth initiate error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to initiate OAuth' }, { status: 500 });
  }
}

function getOAuthClientId(exchange: string): string | undefined {
  switch (exchange.toLowerCase()) {
    case 'binance':
      return process.env.BINANCE_OAUTH_CLIENT_ID;
    case 'okx':
      return process.env.OKX_OAUTH_CLIENT_ID;
    case 'kucoin':
      return process.env.KUCOIN_OAUTH_CLIENT_ID;
    default:
      return undefined;
  }
}
