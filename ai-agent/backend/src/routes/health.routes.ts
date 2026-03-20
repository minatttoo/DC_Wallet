import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { redisService } from '../services/redis.service';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const mongoState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting
  const mongoOk = mongoState === 1;

  // Quick Redis ping
  let redisOk = false;
  try {
    const pong = await (redisService as unknown as { client: { ping(): Promise<string> } | null }).client?.ping();
    redisOk = pong === 'PONG';
  } catch {
    redisOk = false;
  }

  const status = mongoOk ? 'ok' : 'degraded';

  res.status(mongoOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'unavailable',
    },
  });
});

export default router;
