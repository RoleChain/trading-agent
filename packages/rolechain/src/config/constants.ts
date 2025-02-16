// Move all constants here
export const CONSTANTS = {
  SWAP_ROUTER_ADDRESS: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  QUOTER_CONTRACT_ADDRESS: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  NETWORK_ID: 137,
  POSITION_MANAGER_ADDRESS: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  FACTORY_ADDRESS: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  FACTORY_ABI: [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
  ],
  maxFeePerGas: '110',
  maxPriorityFeePerGas: '26'
} as const; 