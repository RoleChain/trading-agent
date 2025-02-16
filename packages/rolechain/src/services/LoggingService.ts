import { v4 as uuidv4 } from 'uuid';
import { ExecutionLog } from '../models/ExecutionLog';
import { AIResponse } from '../types/AIResponse';

export class LoggingService {
  private currentExecutionId: string | null = null;

  public async initializeExecution(aiResponse: AIResponse) {
    this.currentExecutionId = uuidv4();
    return await ExecutionLog.create({
      execution_id: this.currentExecutionId,
      ai_response: JSON.stringify(aiResponse),
      summary: aiResponse.summary,
      logs: [],
      start_time: new Date(),
      status: 'started'
    });
  }

  public createLogger() {
    return {
      log: async (message: string, data?: any) => {
        if (!this.currentExecutionId) return;

        console.log(message, data);
        
        const logEntry = {
          timestamp: new Date(),
          type: 'log',
          message,
          data
        };

        await ExecutionLog.updateOne(
          { execution_id: this.currentExecutionId },
          { $push: { logs: logEntry } }
        );
      },
      error: async (message: string, error?: any) => {
        if (!this.currentExecutionId) return;

        console.log(message, error);
        
        const logEntry = {
          timestamp: new Date(),
          type: 'error',
          message,
          error: error?.message || error
        };

        await ExecutionLog.updateOne(
          { execution_id: this.currentExecutionId },
          { $push: { logs: logEntry } }
        );
      }
    };
  }

  public async completeExecution(error?: string) {
    if (!this.currentExecutionId) return;
    
    await ExecutionLog.updateOne(
      { execution_id: this.currentExecutionId },
      { 
        $set: {
          end_time: new Date(),
          status: error ? 'failed' : 'completed',
          error: error
        }
      }
    );

    this.currentExecutionId = null;
  }
} 