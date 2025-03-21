// Token information for common tokens
export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
}

// Token address to info mapping
export const TOKEN_INFO: Record<string, TokenInfo> = {
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { 
    name: 'USD Coin',
    symbol: 'USDC', 
    decimals: 6,
    logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  '0x4200000000000000000000000000000000000006': { 
    name: 'Wrapped Ether',
    symbol: 'WETH', 
    decimals: 18,
    logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  '0xda3d5a7a0b6b1e1a3fbf91b20d29d9cf0d7bd2ef': { 
    name: 'Tether USD',
    symbol: 'USDT', 
    decimals: 6,
    logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { 
    name: 'Dai Stablecoin',
    symbol: 'DAI', 
    decimals: 18,
    logoURI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png'
  },
  // Base Mainnet tokens
  '0x2ae3f1ec7f1f5012cfc6c13a05e9f988bd9459e7': { 
    name: 'Coinbase Wrapped Staked ETH',
    symbol: 'cbETH', 
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/27008/standard/cbeth.png'
  },
  '0x940181a94a35a4569e4529a3cdfb74e38fd98631': { 
    name: 'Aerodrome',
    symbol: 'AERO', 
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/31745/standard/token-logo.png'
  },
  '0x4ed4e862860bed51a9570b96d89af5e1b0efefed': { 
    name: 'Degen',
    symbol: 'degen', 
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/30278/standard/degen.png'
  },
  '0x78a087d713be963bf307b18f2ff8122ef9a63ae9': { 
    name: 'Bald',
    symbol: 'BALD', 
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/30255/standard/bald.jpeg'
  }
};
