import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { createWeb3Reader } from '@/lib/web3/position-reader/core';
import { detectAllWeb3Positions } from '@/lib/web3/position-reader';

export const POST = withAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { walletAddress, chains } = body as Record<string, unknown>;

  if (typeof walletAddress !== 'string' || !walletAddress.startsWith('0x')) {
    return err('walletAddress must be a valid hex address', 'VALIDATION_ERROR', 422);
  }

  const chainIds: number[] = Array.isArray(chains)
    ? chains.filter((c) => typeof c === 'number')
    : [1]; // default to mainnet

  if (chainIds.length === 0) {
    return err('chains must be a non-empty array of chain IDs', 'VALIDATION_ERROR', 422);
  }

  try {
    const clients = Object.fromEntries(
      chainIds.map((id) => [id, createWeb3Reader(id)]),
    ) as Record<number, ReturnType<typeof createWeb3Reader>>;

    const positions = await detectAllWeb3Positions(
      clients,
      walletAddress as `0x${string}`,
    );

    return ok(positions);
  } catch (e) {
    console.error('[web3/detect-positions]', e);
    return err('Position detection failed', 'SERVER_ERROR', 500);
  }
});
