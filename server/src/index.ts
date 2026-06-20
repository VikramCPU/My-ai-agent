import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFound } from './middleware/errorHandler';
import githubRoutes from './routes/github';
import aiRoutes from './routes/ai';
import healthRoutes from './routes/health';
import settingsRoutes from './routes/settings';
import buildRoutes from './routes/build';
import { logger } from './utils/logger';
import fs from 'fs';

fs.mkdirSync('logs', { recursive: true });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

app.use('/api/health', healthRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/build', buildRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 AI Agent Server running on http://localhost:${PORT}`);
  logger.info(`GitHub PAT: ${process.env.GITHUB_PAT ? '✓ configured' : '✗ missing'}`);
  logger.info(`NVIDIA API: ${process.env.NVIDIA_API_KEY ? '✓ configured' : '✗ missing'}`);
});

export default app;
