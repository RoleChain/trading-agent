import { UniswapCommandExecutor } from '../executor';
import { AIResponse } from '../types/AIResponse';

const executor = new UniswapCommandExecutor();

export const executeCommands = async (aiResponse: string) => {
  try {
    const response: AIResponse = JSON.parse(aiResponse);
    console.log('Summary:', response.summary);
    
    await executor.execute(response);
  } catch (e) {
    console.error('Failed to execute commands:', e);
  }
}; 