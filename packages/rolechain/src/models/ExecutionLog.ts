import { Schema, model } from 'mongoose';

const LogEntrySchema = new Schema({
  timestamp: { type: Date, required: true },
  type: { type: String, enum: ['log', 'error'], required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  error: { type: Schema.Types.Mixed }
});

const ExecutionLogSchema = new Schema({
  execution_id: { type: String, required: true },
  ai_response: { type: String, required: true },
  summary: { type: String, required: true },
  logs: [LogEntrySchema],
  start_time: { type: Date, required: true },
  end_time: { type: Date },
  status: { type: String, enum: ['started', 'completed', 'failed'], required: true },
  error: { type: String }
});

export const ExecutionLog = model('ExecutionLog', ExecutionLogSchema); 