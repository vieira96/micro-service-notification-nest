import { Test, TestingModule } from '@nestjs/testing';
import { PageResponseDto } from '@/common/dto/page-response.dto';
import { NotificationsController } from '@/notifications/controllers/notifications.controller';
import { NotificationsService } from '@/notifications/services/notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: {
    createFromBookCreated: jest.Mock;
    findAll: jest.Mock;
    markAsRead: jest.Mock;
    markAllAsRead: jest.Mock;
  };

  const authenticatedRequest = (id: string) =>
    ({ user: { id } }) as never;

  beforeEach(async () => {
    service = {
      createFromBookCreated: jest.fn(),
      findAll: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('consome o evento delegando a persistência ao service', async () => {
    const payload = { bookId: 'book-1', title: 'Dom Casmurro' };

    await controller.handleBookCreated(payload);

    expect(service.createFromBookCreated).toHaveBeenCalledWith(payload);
  });

  it('lista com paginação do usuário logado', async () => {
    const page = PageResponseDto.from([], 0, 1, 10);
    service.findAll.mockResolvedValue(page);

    const result = await controller.findAll(
      authenticatedRequest('user-1'),
      { page: 1, size: 10 },
    );

    expect(service.findAll).toHaveBeenCalledWith('user-1', {
      page: 1,
      size: 10,
    });
    expect(result).toBe(page);
  });

  it('marca uma como lida para o usuário logado', async () => {
    service.markAsRead.mockResolvedValue({ notificationId: 'n1' });

    await controller.markAsRead('n1', authenticatedRequest('user-1'));

    expect(service.markAsRead).toHaveBeenCalledWith('n1', 'user-1');
  });

  it('marca todas como lidas para o usuário logado', async () => {
    service.markAllAsRead.mockResolvedValue({ count: 3 });

    await controller.markAllAsRead(authenticatedRequest('user-1'));

    expect(service.markAllAsRead).toHaveBeenCalledWith('user-1');
  });
});
