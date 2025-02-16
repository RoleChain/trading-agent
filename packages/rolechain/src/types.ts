export interface DataCollectionCommand {
  command: 'DATA_COLLECTION';
  params: Record<string, never>;
}

export interface MintPositionCommand {
  command: 'MINT_POSITION';
  params: {
    token_a_amount: number;
    token_b_amount: number;
    from_price: number;
    to_price: number;
    fee_tier: string;
    pool_address: string;
    token_a_address: string;
    token_b_address: string;
    token_a_decimals: number;
    token_b_decimals: number;
  }
}

export interface AddLiquidityCommand {
  command: 'ADD_LIQUIDITY';
  params: {
    token_id: number;
    token_a_amount: number;
    token_b_amount: number;
    pool_address: string;
    token_a_address: string;
    token_b_address: string;
    token_a_decimals: number;
    token_b_decimals: number;
  }
}

export interface RemoveLiquidityCommand {
  command: 'REMOVE_LIQUIDITY';
  params: {
    token_id: number;
    percentage_bps: number;
    pool_address: string;
  }
}

export interface SwapCommand {
  command: 'SWAP';
  params: {
    input_token: string;
    output_token: string;
    swap_amount_in: number;
    swap_amount_out: number;
  }
}

export type UniswapCommand = 
  | DataCollectionCommand 
  | MintPositionCommand 
  | AddLiquidityCommand 
  | RemoveLiquidityCommand 
  | SwapCommand; 