import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { env } from '@/lib/env';
import { createWeb3Reader, isValidAddress } from '@/lib/web3/position-reader/core';
import { getAaveSuppliedPositions } from '@/lib/web3/position-reader/aave';

const SEPOLIA = 11155111;
const BASE_SEPOLIA = 84532;
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
 * RPC URL for each chain the scan supports. A chain is only scannable if both
 * an RPC and Aave V3 addresses (see addresses.ts) exist for it.
 * TODO: extend to a full parallel multi-chain scan  see memory note.
 */
function rpcForChain(chainId: number): string | undefined {
  switch (chainId) {
    case SEPOLIA:
      return env.RPC_URL_SEPOLIA;
    case BASE_SEPOLIA:
      return env.RPC_URL_BASE_SEPOLIA ?? 'https://sepolia.base.org';
    default:
      return undefined;
  }
}

/**
 * POST /api/web3/scan-aave  { address, chainId? }
 * Reads the wallet's Aave V3 supply positions on the connected network
 * (chain-aware; defaults to Sepolia). If the connected wallet has none and
 * DEMO_WALLET_ADDRESS is set, falls back to that address for the demo.
 */
export const POST = withAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { address, chainId: rawChainId } = (body ?? {}) as { address?: unknown; chainId?: unknown };
  const wallet = typeof address === 'string' && isValidAddress(address) ? address : null;
  const chainId = typeof rawChainId === 'number' ? rawChainId : SEPOLIA;

  const rpcUrl = rpcForChain(chainId);
  if (!rpcUrl) {
    return err(
      `Network ${chainId} is not supported for scanning yet`,
      'CHAIN_NOT_SUPPORTED',
      400,
    );
  }

  const client = createWeb3Reader(chainId, rpcUrl);

  const scan = async (addr: `0x${string}`): Promise<DetectedAavePosition[]> => {
    const positions = await getAaveSuppliedPositions(client, addr, chainId);
    return positions
      .filter((p) => p.amount > 0)
      .map((p) => ({
        asset: p.asset,
        amount: p.amount,
        apr: p.apr,
        chainId,
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
