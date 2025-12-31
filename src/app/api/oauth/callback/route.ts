import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';
import { getExchangeAdapter } from '@/lib/exchanges/cex-adapter-oauth';

// GET /api/oauth/callback?code=xxx&state=xxx&exchange=Binance
// Handle OAuth callback from exchanges
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const exchange = req.nextUrl.searchParams.get('exchange');

    if (!code || !state || !exchange) {
      return NextResponse.json(
        { success: false, message: 'Missing code, state, or exchange parameter' },
        { status: 400 }
      );
    }

    // Verify state matches (prevent CSRF)
    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    const oauthState = await db.collection('oauth_states').findOne({ state });
    if (!oauthState || oauthState.exchange !== exchange) {
      return NextResponse.json({ success: false, message: 'Invalid or expired state' }, { status: 401 });
    }

    const userId = oauthState.userId;
    const redirectUri = `${req.nextUrl.origin}/api/oauth/callback`;

    // Exchange code for token
    const adapter = getExchangeAdapter(exchange);
    const clientId = getOAuthClientId(exchange);
    const clientSecret = getOAuthClientSecret(exchange);

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, message: `OAuth credentials not configured for ${exchange}` },
        { status: 500 }
      );
    }

    let tokenData;
    try {
      tokenData = await adapter.exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
    } catch (error) {
      console.error(`OAuth token exchange error for ${exchange}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, message: `Failed to exchange code: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Store token in user document
    const user = await db.collection('users').findOne({ _id: { $oid: userId } });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
    }

    const expiresAt = tokenData.expiresIn ? Date.now() + tokenData.expiresIn * 1000 : undefined;

    await db.collection('users').updateOne(
      { _id: { $oid: userId } },
      {
        $set: {
          [`exchangeTokens.${exchange}`]: {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken || null,
            expiresAt,
            connectedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // Clean up state
    await db.collection('oauth_states').deleteOne({ state });

    // Redirect back to app with success message
    return NextResponse.redirect(`${req.nextUrl.origin}/dashboard/settings?exchange=${exchange}&connected=true`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
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

function getOAuthClientSecret(exchange: string): string | undefined {
  switch (exchange.toLowerCase()) {
    case 'binance':
      return process.env.BINANCE_OAUTH_CLIENT_SECRET;
    case 'okx':
      return process.env.OKX_OAUTH_CLIENT_SECRET;
    case 'kucoin':
      return process.env.KUCOIN_OAUTH_CLIENT_SECRET;
    default:
      return undefined;
  }
}
