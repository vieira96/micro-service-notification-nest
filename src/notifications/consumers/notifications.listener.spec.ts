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

  beforeEach(async () => {
    service = { create: jest.fn() };
    preferences = { enabledUserIds: jest.fn() };
    realtime = { emitToUsers: jest.fn() };

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

  it('persiste, busca quem aceitou e emite só para eles', async () => {
    const created = {
      id: 'notif-1',
      type: 'BOOK_CREATED',
      title: 'Novo livro: Dom Casmurro',
      message: 'O livro "Dom Casmurro" foi adicionado ao catálogo.',
      path: '/book/book-1',
      url: null,
      createdAt: new Date(),
    };
    service.create.mockResolvedValue(created);
    preferences.enabledUserIds.mockResolvedValue(['user-1', 'user-2']);

    await listener.handleBookCreated({
      bookId: 'book-1',
      title: 'Dom Casmurro',
    });

    expect(service.create).toHaveBeenCalledWith({
      type: 'BOOK_CREATED',
      title: 'Novo livro: Dom Casmurro',
      message: 'O livro "Dom Casmurro" foi adicionado ao catálogo.',
      channels: ['IN_APP'],
      path: '/book/book-1',
    });
    expect(preferences.enabledUserIds).toHaveBeenCalledWith('APP_NOTIFICATION');
    expect(realtime.emitToUsers).toHaveBeenCalledWith(
      ['user-1', 'user-2'],
      'notification:new',
      expect.objectContaining({ id: 'notif-1', read: false, readAt: null }),
    );
  });
});
