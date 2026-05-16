/**
 * Web3 Position Detection Types
 */

export type ProtocolType = 'yearn' | 'aave' | 'erc20' | 'lido';

export interface DetectedWeb3Position {
  id?: string;
  symbol: string;
  asset: string;
  platform: string;
  protocolName: string;
  chainName: string;
  amount: number;
  apr: number;
  chain: string;
  detectionType: ProtocolType;
  lastUpdated: string;
  aTokenAddress?: string;
  vaultAddress?: string;
  isActive: boolean;
}

export interface Web3DetectionResult {
  success: boolean;
  data?: {
    positions: DetectedWeb3Position[];
    walletAddress: string;
    chainIds: number[];
    detectedCount: number;
    lastScanned: string;
  };
  error?: string;
}

export interface Web3Chain {
  id: number;
  name: string;
  rpcUrl: string;
  testnet: boolean;
}

export interface ProtocolPositionsGroup {
  protocol: ProtocolType;
  protocolName: string;
  positions: DetectedWeb3Position[];
  totalAmount: number;
  averageApr: number;
}

/**
 * Group positions by protocol type
 */
export function groupPositionsByProtocol(
  positions: DetectedWeb3Position[]
): ProtocolPositionsGroup[] {
  const grouped: Record<ProtocolType, DetectedWeb3Position[]> = {
    yearn: [],
    aave: [],
    erc20: [],
    lido: [],
  };

  positions.forEach((pos) => {
    grouped[pos.detectionType].push(pos);
  });

  const protocolNames: Record<ProtocolType, string> = {
    yearn: 'Yearn',
    aave: 'Aave V3',
    erc20: 'ERC20 Tokens',
    lido: 'Lido',
  };

  const result: ProtocolPositionsGroup[] = [];

  // Keep priority order: Yearn, Aave, ERC20, Lido
  const priorityOrder: ProtocolType[] = ['yearn', 'aave', 'erc20', 'lido'];

  for (const protocol of priorityOrder) {
    if (grouped[protocol].length > 0) {
      const positions = grouped[protocol];
      const totalAmount = positions.reduce((sum, p) => sum + p.amount, 0);
      const averageApr =
        positions.reduce((sum, p) => sum + p.apr, 0) / positions.length;

      result.push({
        protocol,
        protocolName: protocolNames[protocol],
        positions,
        totalAmount,
        averageApr,
      });
    }
  }

  return result;
}

/**
 * Format large numbers for display
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (value >= 1e6) {
    return (value / 1e6).toFixed(decimals) + 'M';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(decimals) + 'K';
  }
  return value.toFixed(decimals);
}

/**
 * Get protocol icon class name (for styling)
 */
export function getProtocolIconClass(protocol: ProtocolType): string {
  const icons: Record<ProtocolType, string> = {
    yearn: 'protocol-yearn',
    aave: 'protocol-aave',
    erc20: 'protocol-erc20',
    lido: 'protocol-lido',
  };
  return icons[protocol];
}

/**
 * Get protocol color class (for styling)
 */
export function getProtocolColorClass(protocol: ProtocolType): string {
  const colors: Record<ProtocolType, string> = {
    yearn: 'bg-purple-600',
    aave: 'bg-blue-600',
    erc20: 'bg-gray-600',
    lido: 'bg-orange-600',
  };
  return colors[protocol];
}
