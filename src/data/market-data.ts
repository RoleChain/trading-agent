import axios from 'axios';
import { MarketData } from '../types';

export class MarketDataCollector {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTokenPrice(tokenAddress: string): Promise<MarketData> {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/token_price/ethereum`,
      {
        params: {
          contract_addresses: tokenAddress,
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      }
    );

    return this.transformMarketData(response.data);
  }

  private transformMarketData(rawData: any): MarketData {
    // Transform API response to MarketData type
    return {
      // ... transformation logic
    };
  }
} 