import { UniswapDataCollector } from '../data/pool-data';
import { MarketDataCollector } from '../data/market-data';
import { LiquidityPositionModel } from '../ai/model';
import { PositionManager } from '../positions/position-manager';

export class UniswapAgent {
  private poolDataCollector: UniswapDataCollector;
  private marketDataCollector: MarketDataCollector;
  private model: LiquidityPositionModel;
  private positionManager: PositionManager;

  constructor(
    graphEndpoint: string,
    marketApiKey: string,
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    positionManagerAddress: string
  ) {
    this.poolDataCollector = new UniswapDataCollector(graphEndpoint);
    this.marketDataCollector = new MarketDataCollector(marketApiKey);
    this.model = new LiquidityPositionModel();
    this.positionManager = new PositionManager(
      provider,
      signer,
      positionManagerAddress
    );
  }

  async run(poolAddress: string) {
    try {
      // 1. Collect data
      const poolData = await this.poolDataCollector.getPoolData(poolAddress);
      const marketData = await this.marketDataCollector.getTokenPrice(poolData.token0);
      
      // 2. Get model prediction
      const prediction = await this.model.predict({
        poolData,
        marketData,
        positions: [] // Add current positions
      });

      // 3. Execute position changes
      const tx = await this.positionManager.executeAction(prediction);
      await tx.wait();

      console.log('Successfully executed position change');
    } catch (error) {
      console.error('Error in agent execution:', error);
    }
  }
} 