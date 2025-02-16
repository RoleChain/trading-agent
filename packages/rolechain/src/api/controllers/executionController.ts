import { Request, Response } from 'express';
import { ExecutionLog } from '../../models/ExecutionLog';

export const getExecutions = async (req: Request, res: Response) => {
  try {
    const executions = await ExecutionLog.find()
      .sort({ start_time: -1 })
      .limit(100);
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};

export const getExecutionById = async (req: Request, res: Response) => {
  try {
    const execution = await ExecutionLog.findOne({ 
      execution_id: req.params.executionId 
    });
    
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
}; 