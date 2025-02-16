// Move Uniswap-related types here
export interface MintPositionCommand {
  command: 'MINT_POSITION';
  params: {
    token_a_amount: number;
    token_b_amount: number;
    token_a_address: string;
    token_b_address: string;
    token_a_decimals: number;
    token_b_decimals: number;
    pool_address: string;
    fee_tier: string;
    from_price: number;
    to_price: number;
  };
}

export interface AddLiquidityCommand {
  command: 'ADD_LIQUIDITY';
  params: {
    token_id: number;
    token_a_amount: number;
    token_b_amount: number;
    token_a_address: string;
    token_b_address: string;
    token_a_decimals: number;
    token_b_decimals: number;
    pool_address: string;
  };
}

export interface RemoveLiquidityCommand {
  command: 'REMOVE_LIQUIDITY';
  params: {
    token_id: number;
    percentage_bps: number;
    pool_address: string;
  };
}

export interface SwapCommand {
  command: 'SWAP';
  params: {
    input_token: string;
    output_token: string;
    swap_amount_in: number;
    swap_amount_out: number;
  };
}

// ... other Uniswap command interfaces ...

export type UniswapCommand = 
  | MintPositionCommand 
  | AddLiquidityCommand 
  | RemoveLiquidityCommand 
  | SwapCommand; 