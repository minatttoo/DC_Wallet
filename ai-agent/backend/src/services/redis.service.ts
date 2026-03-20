import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../config/logger';

class RedisService {
  private client: Redis | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
        lazyConnect: true,
      });

      this.client.on('error', (err: Error) => {
        logger.warn('Redis error (non-fatal):', err.message);
      });

      await this.client.connect();
      logger.info('Redis connected');
    } catch (err) {
      logger.warn('Redis unavailable — caching disabled', { err });
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // silently ignore cache write errors
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // silently ignore
    }
  }

  async flushUserCache(userId: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(`user:${userId}:*`);
      if (keys.length > 0) await this.client.del(...keys);
    } catch {
      // silently ignore
    }
  }
}

export const redisService = new RedisService();
