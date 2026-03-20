import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import { config } from './config';
import { logger } from './config/logger';
import { redisService } from './services/redis.service';
import { rabbitMQService } from './services/rabbitmq.service';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import goalRoutes from './routes/goals.routes';
import taskRoutes from './routes/tasks.routes';
import agentRoutes from './routes/agent.routes';
import routineRoutes from './routes/routines.routes';
import healthRoutes from './routes/health.routes';

const app = express();

// ─── Security & utilities ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// ─── Rate limiting ───────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please wait.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/routines', routineRoutes);
app.use('/health', healthRoutes);

// ─── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  await mongoose.connect(config.mongodb.uri);
  logger.info('MongoDB connected');

  await redisService.connect();
  await rabbitMQService.connect();

  app.listen(config.port, () => {
    logger.info(`Personal AI Agent backend running on port ${config.port} [${config.nodeEnv}]`);
  });
}

bootstrap().catch((err: unknown) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});

export default app;
