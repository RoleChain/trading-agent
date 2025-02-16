import { ethers } from 'ethers';
import { config } from './config';
import { UniswapAgent } from './agent/uniswap-agent';

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(config.network.rpcUrl);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const agent = new UniswapAgent(
    config.uniswap.graphEndpoint,
    config.api.coingeckoApiKey,
    provider,
    signer,
    config.uniswap.positionManagerAddress
  );

  // Run agent for specific pool
  const poolAddress = '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8'; // USDC/ETH pool
  await agent.run(poolAddress);
}

main().catch(console.error); 