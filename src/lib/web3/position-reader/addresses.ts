/**
 * Contract addresses by chain
 */

interface ContractAddresses {
  lido?: {
    steth: `0x${string}`;
    wsteth?: `0x${string}`;
  };
  aave?: {
    poolV3: `0x${string}`;
    poolDataProvider?: `0x${string}`;
  };
  yearn?: {
    registry?: `0x${string}`;
  };
  common?: {
    usdc: `0x${string}`;
    usdt?: `0x${string}`;
    dai?: `0x${string}`;
  };
}

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Ethereum Mainnet
  1: {
    lido: {
      steth: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
      wsteth: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    },
    aave: {
      poolV3: '0x87870bca3f3fd6335c3f4ce8392d69350b4de5e2',
      poolDataProvider: '0x7b4eb56e7cd5b770264487ae5a1d6f7991786b11',
    },
    yearn: {
      registry: '0x50c1a2ea0a861a967d9cff2d5d5fa5d4b33a0916',
    },
    common: {
      usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      usdt: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      dai: '0x6b175474e89094c44da98b954eedeac495271d0f',
    },
  },

  // Sepolia Testnet
  11155111: {
    lido: {
      steth: '0x6320cD32aA674d2898a289f694e6481B633BCa7f',
    },
    aave: {
      poolV3: '0xc9b00176c76d19277f6624185f11e31b0d00e262',
      poolDataProvider: '0x3341f561914081cc02be1275081b5293b2728b12',
    },
    common: {
      usdc: '0x94a9d9ac8a22534e3fea1f4f0a4b0dc5407c8c28',
      usdt: '0xaabbccddee0120000000000000000000000000000',
      dai: '0xff34b3d4aee8ddcd6f9aace3ee0feef2d9e88a01',
    },
  },

  // Polygon Mainnet
  137: {
    lido: {
      steth: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    },
    aave: {
      poolV3: '0x794a61358d6845594f94dc1db02a252b5b4814ad',
      poolDataProvider: '0xf04991f90fac7b92d12f65cc0ba932074e27b5ee',
    },
    common: {
      usdc: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      usdt: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
      dai: '0x8f3cf7ad23cd3cadbd9735aff958023d60313e57',
    },
  },

  // Polygon Amoy Testnet
  80002: {
    common: {
      usdc: '0x41e94eb019c0762f9bfcf9fb1e58725bab9f2d0b',
    },
  },

  // Arbitrum Mainnet
  42161: {
    lido: {
      steth: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    },
    aave: {
      poolV3: '0x794a61358d6845594f94dc1db02a252b5b4814ad',
      poolDataProvider: '0x69fa688f1dc47d4b5d8029d5a35524f049236c45',
    },
    common: {
      usdc: '0xff970a61a04b1ca14834a43f5de4533ebddb5f86',
      usdt: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      dai: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    },
  },

  // Optimism Mainnet
  10: {
    aave: {
      poolV3: '0x794a61358d6845594f94dc1db02a252b5b4814ad',
      poolDataProvider: '0x69fa688f1dc47d4b5d8029d5a35524f049236c45',
    },
    common: {
      usdc: '0x7f5c764cbc14f9669b88837ca1490cccf460b4b8',
      usdt: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
      dai: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    },
  },

  // TractSafe Testnet
  35935: {
    common: {
      usdc: '0x0000000000000000000000000000000000000000', // TODO: Add TractSafe USDC if available
    },
  },
};

export function getContractAddresses(chainId: number): ContractAddresses {
  return CONTRACT_ADDRESSES[chainId] || {};
}
