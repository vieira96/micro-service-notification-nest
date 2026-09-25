import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsListener } from '@/notifications/consumers/notifications.listener';
import { NotificationsService } from '@/notifications/services/notifications.service';
import { PreferencesService } from '@/preferences/services/preferences.service';
import { RealtimeGateway } from '@/realtime/realtime.gateway';

describe('NotificationsListener', () => {
  let listener: NotificationsListener;
  let service: { create: jest.Mock };
  let preferences: { enabledUserIds: jest.Mock };
  let realtime: { emitToUsers: jest.Mock };
  let channel: { ack: jest.Mock; nack: jest.Mock };
  let context: { getChannelRef: jest.Mock; getMessage: jest.Mock };
  const message = { fields: {}, content: Buffer.from('') };

  beforeEach(async () => {
    service = { create: jest.fn() };
    preferences = { enabledUserIds: jest.fn() };
    realtime = { emitToUsers: jest.fn() };
    channel = { ack: jest.fn(), nack: jest.fn() };
    context = {
      getChannelRef: jest.fn().mockReturnValue(channel),
      getMessage: jest.fn().mockReturnValue(message),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsListener,
        { provide: NotificationsService, useValue: service },
        { provide: PreferencesService, useValue: preferences },
        { provide: RealtimeGateway, useValue: realtime },
      ],
    }).compile();

    listener = module.get<NotificationsListener>(NotificationsListener);
  });

  it('persiste, emite para quem aceitou e confirma a mensagem', async () => {
    const created = {
      id: 'notif-1',
      type: 'BOOK_CREATED',
      title: 'Novo livro: Dom Casmurro',
      message: 'O livro "Dom Casmurro" foi adicionado ao catálogo.',
      path: '/book/book-1',
      url: null,
      createdAt: new Date(),
    };
    service.create.mockResolvedValue({
      notification: created,
      duplicate: false,
    });
    preferences.enabledUserIds.mockResolvedValue(['user-1', 'user-2']);

    await listener.handleBookCreated(
      {
        bookId: 'book-1',
        title: 'Dom Casmurro',
      },
      context as never,
    );

    expect(service.create).toHaveBeenCalledWith({
      type: 'BOOK_CREATED',
      title: 'Novo livro: Dom Casmurro',
      message: 'O livro "Dom Casmurro" foi adicionado ao catálogo.',
      channels: ['IN_APP'],
      path: '/book/book-1',
      eventKey: 'BOOK_CREATED:book-1',
    });
    expect(preferences.enabledUserIds).toHaveBeenCalledWith('APP_NOTIFICATION');
    expect(realtime.emitToUsers).toHaveBeenCalledWith(
      ['user-1', 'user-2'],
      'notification:new',
      expect.objectContaining({ id: 'notif-1', read: false, readAt: null }),
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('confirma sem emitir quando é duplicado', async () => {
    service.create.mockResolvedValue({
      notification: { id: 'notif-1' },
      duplicate: true,
    });

    await listener.handleBookCreated(
      {
        bookId: 'book-1',
        title: 'Dom Casmurro',
      },
      context as never,
    );

    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
    expect(preferences.enabledUserIds).not.toHaveBeenCalled();
    expect(realtime.emitToUsers).not.toHaveBeenCalled();
  });

  it('rejeita sem requeue quando o processamento falha', async () => {
    service.create.mockRejectedValue(new Error('banco fora do ar'));

    await listener.handleBookCreated(
      {
        bookId: 'book-1',
        title: 'Dom Casmurro',
      },
      context as never,
    );

    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(realtime.emitToUsers).not.toHaveBeenCalled();
  });
});
