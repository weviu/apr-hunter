/**
 * Export all position readers
 */

export * from './core';
export * from './abis';
export * from './addresses';
export * from './lido';
export * from './aave';
export * from './yearn';

// Aggregate position types
export type { LidoPosition } from './lido';
export type { AavePosition } from './aave';
export type { YearnPosition } from './yearn';

export type AllPositions = 
  | (import('./lido').LidoPosition & { type: 'lido' })
  | (import('./aave').AavePosition & { type: 'aave' })
  | (import('./yearn').YearnPosition & { type: 'yearn' });

/**
 * Combine all position readers for a user
 */
export async function detectAllWeb3Positions(
  clients: Record<number, import('viem').PublicClient>,
  userAddress: `0x${string}`,
  aprMap?: Map<string, number>
): Promise<AllPositions[]> {
  const positions: AllPositions[] = [];

  // Detect Lido positions
  for (const [chainId, client] of Object.entries(clients)) {
    const cidNum = Number(chainId);
    const lidoPos = await (await import('./lido')).getLidoPosition(
      client,
      userAddress,
      cidNum,
      aprMap?.get('lido')
    );
    if (lidoPos) {
      positions.push({ 
        ...lidoPos, 
        type: 'lido' 
      } as AllPositions);
    }

    // Detect Aave positions
    const aavePos = await (await import('./aave')).getAaveSuppliedPositions(
      client,
      userAddress,
      cidNum,
      aprMap
    );
    positions.push(...aavePos.map(p => ({ 
      ...p, 
      type: 'aave' 
    } as AllPositions)));

    // Detect Yearn positions
    const yearnPos = await (await import('./yearn')).getYearnPositions(
      client,
      userAddress,
      cidNum,
      aprMap
    );
    positions.push(...yearnPos.map(p => ({ 
      ...p, 
      type: 'yearn' 
    } as AllPositions)));
  }

  return positions;
}
