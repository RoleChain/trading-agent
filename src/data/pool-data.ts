import { GraphQLClient } from 'graphql-request';
import { PoolData } from '../types';

export class UniswapDataCollector {
  private client: GraphQLClient;
  
  constructor(endpoint: string) {
    this.client = new GraphQLClient(endpoint);
  }

  async getPoolData(poolAddress: string): Promise<PoolData> {
    const query = `
      query getPool($poolAddress: String!) {
        pool(id: $poolAddress) {
          token0Price
          token1Price
          liquidity
          tick
          feeTier
        }
      }
    `;

    const response = await this.client.request(query, { poolAddress });
    // Transform and return data
    return this.transformPoolData(response);
  }

  private transformPoolData(rawData: any): PoolData {
    // Transform GraphQL response to PoolData type
    return {
      // ... transformation logic
    };
  }
} 