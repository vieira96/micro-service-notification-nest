import { Test, TestingModule } from '@nestjs/testing';
import { connect } from 'amqplib';
import { RabbitTopologyService } from '@/rabbit/rabbit-topology.service';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

const mockedConnect = connect as jest.Mock;

describe('RabbitTopologyService', () => {
  let service: RabbitTopologyService;
  let channel: {
    assertExchange: jest.Mock;
    assertQueue: jest.Mock;
    bindQueue: jest.Mock;
    close: jest.Mock;
  };
  let connection: { createChannel: jest.Mock; close: jest.Mock };

  const previousEnv = { ...process.env };

  beforeEach(async () => {
    process.env.RABBITMQ_URL = 'amqp://test:5672';
    process.env.NOTIFICATIONS_QUEUE = 'notifications.book-created';

    channel = {
      assertExchange: jest.fn(),
      assertQueue: jest.fn(),
      bindQueue: jest.fn(),
      close: jest.fn(),
    };
    connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
      close: jest.fn(),
    };
    mockedConnect.mockResolvedValue(connection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RabbitTopologyService],
    }).compile();

    service = module.get<RabbitTopologyService>(RabbitTopologyService);
  });

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.clearAllMocks();
  });

  it('declara DLX, DLQ e binding no boot', async () => {
    await service.onModuleInit();

    expect(mockedConnect).toHaveBeenCalledWith('amqp://test:5672');
    expect(channel.assertExchange).toHaveBeenCalledWith(
      'notifications.book-created.dlx',
      'direct',
      { durable: true },
    );
    expect(channel.assertQueue).toHaveBeenCalledWith(
      'notifications.book-created.dlq',
      { durable: true },
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      'notifications.book-created.dlq',
      'notifications.book-created.dlx',
      'notifications.book-created',
    );
    expect(channel.close).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
  });
});
