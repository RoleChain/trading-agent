import dotenv from "dotenv";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import OpenAI from "openai";
import { generateText } from "ai";
import { UniswapCommandExecutor } from './executor';
import { UniswapCommand } from './types';
import { getMarketData } from './data/marketData';
import { getWalletBalance } from './data/walletData';
import { SYSTEM_PROMPT } from './prompts/systemPrompt';

dotenv.config();

const AI_PROVIDER = process.env.AI_PROVIDER || 'deepinfra'; // 'openai' or 'deepinfra'

const getAIModel = () => {
  switch (AI_PROVIDER) {
    case 'openai':
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      return async ({ messages }: { messages: any[] }) => {
        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages,
          temperature: 0.7,
        });
        
        let text = response.choices[0].message.content || '';
        text = text.replace(/```json\n?|\n?```/g, '');
        text = text.trim();
        
        return { text };
      };

    case 'deepinfra':
    default:
      const deepinfra = createDeepInfra({
        apiKey: process.env.DEEPINFRA_API_TOKEN as string,
      });
      return ({ messages }: { messages: any[] }) => 
        generateText({
          model: deepinfra("mistralai/Mixtral-8x7B-Instruct-v0.1"),
          messages
        });
  }
};

const executor = new UniswapCommandExecutor();

// const executeCommands = async (aiResponse: string) => {
//   try {
//     const commands: UniswapCommand[] = JSON.parse(aiResponse);
    
//     // Execute commands sequentially
//     await executor.execute(commands);
//   } catch (e) {
//     console.error('Failed to execute commands:', e);
//   }
// };

const main = async () => {
  try {
    const [marketData, walletBalance] = await Promise.all([
      getMarketData(),
      getWalletBalance()
    ]);

    const generateResponse = getAIModel();
    const { text } = await generateResponse({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Market data: ${JSON.stringify(marketData)}. My wallet balance: ${JSON.stringify(walletBalance)}. Give me a good pool to provide liquidity on. Use only 10% of my wallet balance` }
      ]
    });

    console.log('AI Response:', text);
    //await executeCommands(text);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the program
main(); 