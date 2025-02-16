import express from 'express';
import { getExecutions, getExecutionById } from '../controllers/executionController';

const router = express.Router();

router.get('/', getExecutions);
router.get('/:executionId', getExecutionById);

export default router; 