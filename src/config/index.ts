export const config = {
  network: {
    rpcUrl: process.env.RPC_URL || 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
    chainId: 1,
  },
  uniswap: {
    positionManagerAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    graphEndpoint: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  },
  api: {
    coingeckoApiKey: process.env.COINGECKO_API_KEY,
  },
  model: {
    path: './models/latest.h5',
    updateInterval: 3600, // 1 hour
  },
  monitoring: {
    enabled: true,
    logLevel: 'info',
  },
}; 