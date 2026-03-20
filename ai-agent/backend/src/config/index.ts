import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? 'development';

// Warn loudly when the JWT secret is the default placeholder in production
if (nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_me')) {
  // eslint-disable-next-line no-console
  console.error(
    '[SECURITY] JWT_SECRET environment variable is not set or uses the default placeholder. ' +
      'Set a strong random secret before running in production.',
  );
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv,

  mongodb: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/personal_ai_agent',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'change_me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  openai: {
    useAzure: process.env.OPENAI_USE_AZURE === 'true',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    azure: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? '',
      apiKey: process.env.AZURE_OPENAI_API_KEY ?? '',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-02-01',
    },
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  },
};
