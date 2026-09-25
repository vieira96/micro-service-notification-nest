import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChannelModel, connect } from 'amqplib';

@Injectable()
export class RabbitTopologyService implements OnModuleInit {
  private readonly logger = new Logger(RabbitTopologyService.name);

  async onModuleInit(): Promise<void> {
    const url =
      process.env.RABBITMQ_URL ??
      'amqp://notifications:notifications@localhost:5672';
    const queue =
      process.env.NOTIFICATIONS_QUEUE ?? 'notifications.book-created';
    const dlx = `${queue}.dlx`;
    const dlq = `${queue}.dlq`;

    let connection: ChannelModel | undefined;
    try {
      connection = await connect(url);
      const channel = await connection.createChannel();
      await channel.assertExchange(dlx, 'direct', { durable: true });
      await channel.assertQueue(dlq, { durable: true });
      await channel.bindQueue(dlq, dlx, queue);
      await channel.close();
      this.logger.log(`Topologia Rabbit pronta: DLX=${dlx} DLQ=${dlq}`);
    } finally {
      await connection?.close();
    }
  }
}
