import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from '../config/database';
import executionRoutes from './routes/executionRoutes';
import { CronService } from '../services/CronService';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Add basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/executions', executionRoutes);

const cronService = new CronService();

console.log('Starting DegenLP API server...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

db.connect().then(() => {
  app.listen(port, () => {
    console.log('✨ Server initialization complete');
    console.log(`🚀 API server running at http://localhost:${port}`);
    
    // Start cron jobs
    cronService.startCronJobs();
    
    console.log('Available endpoints:');
    console.log(`  - GET  /health`);
    console.log(`  - GET  /api/executions`);
    console.log(`  - GET  /api/executions/:executionId`);
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

export default app; 