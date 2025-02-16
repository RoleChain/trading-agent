export interface MarketData {
  pool: string;
  pool_address: string;
  token_a_address: string;
  token_b_address: string;
  token_a_decimals: number;
  token_b_decimals: number;
  pool_balance: Record<string, number>;
  volume_24hr: number;
  fee_24hr: number;
  fee_tier: string;
  tvl?: number;
  [key: string]: any; // For dynamic price fields like eth_price, wbtc_price etc.
}

export const getMarketData = async (): Promise<MarketData[]> => {
  // In future, this could be an API call
  return [
    {
      pool: "wpol/usdc",
      pool_address: "0xA374094527e1673A86dE625aa59517c5dE346d32",
      token_a_address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // POL
      token_b_address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC.e
      token_a_decimals: 18,  // MATIC/POL has 18 decimals
      token_b_decimals: 6,   // USDC.e has 6 decimals
      pool_balance: { 
        pol: 3500000,    // 3.5M POL
        usdc: 167600     // 167.6K USDC.e
      },
      volume_24hr: 648000,  // $648.0K
      fee_24hr: 323.99,     // $323.99
      fee_tier: "0.05%",    // As shown in the UI
      tvl: 1700000,
      pol_price: "$0.43056"         // $1.7M
    },
    {
      pool: "wbtc/usdc",
      pool_address: "0xeEF1A9507B3D505f0062f2be9453981255b503c8",
      token_a_address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", // WBTC
      token_b_address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
      token_a_decimals: 8,   // WBTC has 8 decimals
      token_b_decimals: 6,   // USDC has 6 decimals
      pool_balance: {
        wbtc: 9.01,      // 9.01 WBTC
        usdc: 972100     // 972.1K USDC
      },
      volume_24hr: 3200000,  // $3.2M
      fee_24hr: 16000,       // $16K
      fee_tier: "0.05%",    // As shown in the UI
      tvl: 1900000,         // $1.9M
      wbtc_price: "$101417"
    },
    {
      pool: "usdc/usdt",
      pool_address: "0xDaC8A8E6DBf8c690ec6815e0fF03491B2770255D",
      token_a_address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC.e
      token_b_address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT
      token_a_decimals: 6,   // USDC.e has 6 decimals
      token_b_decimals: 6,   // USDT has 6 decimals
      pool_balance: {
        usdc: 355100,    // 355.1K USDC.e
        usdt: 924400     // 924.4K USDT
      },
      volume_24hr: 1000000,  // $1.0M
      fee_24hr: 104.73,      // $104.73
      fee_tier: "0.01%",     // As shown in the UI
      tvl: 1300000,          // $1.3M
      usdt_price: "$0.999"
    }
  ];
}; 

export const getPoolAddress = async (inputToken: string, outputToken: string): Promise<string | null> => {
  const marketData = await getMarketData();
  
  const pool = marketData.find(pool => 
    (pool.token_a_address.toLowerCase() === inputToken.toLowerCase() && 
     pool.token_b_address.toLowerCase() === outputToken.toLowerCase()) ||
    (pool.token_b_address.toLowerCase() === inputToken.toLowerCase() && 
     pool.token_a_address.toLowerCase() === outputToken.toLowerCase())
  );

  return pool ? pool.pool_address : null;
}; 

export const getPoolTokens = async (): Promise<string[]> => {
  const marketData = await getMarketData();
  const tokenAddresses = new Set<string>();
  
  marketData.forEach(pool => {
    tokenAddresses.add(pool.token_a_address);
    tokenAddresses.add(pool.token_b_address);
  });

  return Array.from(tokenAddresses);
}; 
