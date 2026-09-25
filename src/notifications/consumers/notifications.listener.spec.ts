import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsListener } from '@/notifications/consumers/notifications.listener';
import { NotificationsService } from '@/notifications/services/notifications.service';

describe('NotificationsListener', () => {
  let listener: NotificationsListener;
  let service: { create: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsListener,
        { provide: NotificationsService, useValue: service },
      ],
    }).compile();

    listener = module.get<NotificationsListener>(NotificationsListener);
  });

  it('monta a notificação do livro e delega a persistência ao service', async () => {
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
  });
});
