import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { env } from '@/lib/env';
import { createWeb3Reader, isValidAddress } from '@/lib/web3/position-reader/core';
import { getAaveSuppliedPositions } from '@/lib/web3/position-reader/aave';

const SEPOLIA = 11155111;
const AAVE_PRODUCT = 'Lending (Aave V3)';

export interface DetectedAavePosition {
  asset: string;
  amount: number;
  apr: number; // decimal, on-chain
  chainId: number;
  walletAddress: string;
  exchange: 'aave';
  product: string;
}

/**
 * POST /api/web3/scan-aave  { address }
 * Reads the wallet's Aave V3 supply positions on Sepolia (server-side, via the
 * configured RPC). If the connected wallet has none and DEMO_WALLET_ADDRESS is
 * set, falls back to scanning that address so the demo always shows something.
 */
export const POST = withAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { address } = (body ?? {}) as { address?: unknown };
  const wallet = typeof address === 'string' && isValidAddress(address) ? address : null;

  if (!env.RPC_URL_SEPOLIA) {
    return err('Sepolia RPC is not configured', 'RPC_NOT_CONFIGURED', 503);
  }

  const client = createWeb3Reader(SEPOLIA, env.RPC_URL_SEPOLIA);

  const scan = async (addr: `0x${string}`): Promise<DetectedAavePosition[]> => {
    const positions = await getAaveSuppliedPositions(client, addr, SEPOLIA);
    return positions
      .filter((p) => p.amount > 0)
      .map((p) => ({
        asset: p.asset,
        amount: p.amount,
        apr: p.apr,
        chainId: SEPOLIA,
        walletAddress: addr,
        exchange: 'aave' as const,
        product: AAVE_PRODUCT,
      }));
  };

  try {
    let positions = wallet ? await scan(wallet) : [];
    let usedDemo = false;

    const demo = env.DEMO_WALLET_ADDRESS;
    if (positions.length === 0 && demo && isValidAddress(demo) && demo !== wallet) {
      positions = await scan(demo);
      usedDemo = positions.length > 0;
    }

    return ok({ positions, usedDemo });
  } catch (e) {
    console.error('[web3/scan-aave]', e);
    return err('Wallet scan failed', 'SCAN_FAILED', 500);
  }
});
