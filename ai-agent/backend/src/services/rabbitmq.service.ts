import amqp from 'amqplib';
import { config } from '../config';
import { logger } from '../config/logger';

// amqplib v0.10+ returns a ChannelModel from connect()
type AmqplibConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqplibChannel = Awaited<ReturnType<AmqplibConnection['createChannel']>>;

export type QueueName = 'agent.tasks' | 'notifications' | 'analytics';

class RabbitMQService {
  private connection: AmqplibConnection | null = null;
  private channel: AmqplibChannel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      const queues: QueueName[] = ['agent.tasks', 'notifications', 'analytics'];
      for (const q of queues) {
        await this.channel.assertQueue(q, { durable: true });
      }

      logger.info('RabbitMQ connected');
    } catch (err) {
      logger.warn('RabbitMQ unavailable — message queue disabled', { err });
      this.connection = null;
      this.channel = null;
    }
  }

  async publish(queue: QueueName, payload: unknown): Promise<boolean> {
    if (!this.channel) return false;
    try {
      return this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );
    } catch (err) {
      logger.error('RabbitMQ publish error', { queue, err });
      return false;
    }
  }

  async consume(queue: QueueName, handler: (payload: unknown) => Promise<void>): Promise<void> {
    if (!this.channel) return;
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString()) as unknown;
        await handler(payload);
        this.channel?.ack(msg);
      } catch (err) {
        logger.error('RabbitMQ consumer error', { queue, err });
        this.channel?.nack(msg, false, false);
      }
    });
  }
}

export const rabbitMQService = new RabbitMQService();
