export interface PoolData {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  sqrtPriceX96: string;
  liquidity: string;
  tick: number;
}

export interface Position {
  tokenId: number;
  owner: string;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
}

export interface MarketData {
  price: number;
  volume24h: number;
  priceChange24h: number;
  timestamp: number;
}

export interface ModelInput {
  poolData: PoolData;
  marketData: MarketData;
  positions: Position[];
}

export interface ModelOutput {
  action: 'MINT' | 'ADD_LIQUIDITY' | 'REMOVE_LIQUIDITY';
  params: {
    tickLower?: number;
    tickUpper?: number;
    amount0?: string;
    amount1?: string;
    positionId?: number;
  };
} 