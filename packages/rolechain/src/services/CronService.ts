import { getMarketData } from '../data/marketData';
import { getWalletBalance } from '../data/walletData';
import { getAIModel } from '../utils/ai';
import { executeCommands } from '../utils/executor';
import { LoggingService } from './LoggingService';
import { Agenda } from 'agenda';
import { db } from '../config/database';

export class CronService {
  private logger: LoggingService;
  private agenda: Agenda;

  constructor() {
    this.logger = new LoggingService();
    this.agenda = new Agenda({
      db: { address: process.env.MONGODB_URI || 'mongodb://localhost:27017/degenlp' }
    });
  }

  public async startCronJobs() {
    // Define the job
    this.agenda.define('check market', async (job: any) => {
      await this.runMarketCheck();
    });

    // Start agenda
    await this.agenda.start();

    // Schedule the job
    await this.agenda.every('5 minutes', 'check market');

    console.log('📅 Market checks started - running every 5 minutes');
  }

  public async stopCronJobs() {
    await this.agenda.stop();
  }

  private async runMarketCheck() {
    try {
      console.log('🕒 Running scheduled market check...');
      
      const [marketData, walletBalance] = await Promise.all([
        getMarketData(),
        getWalletBalance()
      ]);

      console.log('Market data:', marketData);
      console.log('Wallet balance:', walletBalance);

      const generateResponse = getAIModel();
      let { text } = await generateResponse({
        messages: [
          { role: "system", content: "Previous analysis complete. Analyzing new market data for updates..." },
          { role: "user", content: `Market data: ${JSON.stringify(marketData)}. My wallet balance: ${JSON.stringify(walletBalance)}. Check if any changes require adjusting positions.` }
        ]
      });

      // Clean up response text to extract just the JSON
      text = text.replace(/```json\n?|\n?```/g, ''); // Remove code blocks
      text = text.match(/\{[\s\S]*\}/)?.[0] || text; // Extract JSON object
      text = text.trim();
    

      console.log('AI Response:', text);
      await executeCommands(text);

    } catch (error) {
      console.error('Market check failed:', error);
      await this.logger.createLogger().error('Market check failed', error);
    }
  }
} 