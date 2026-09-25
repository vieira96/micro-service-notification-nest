import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateNotificationInput,
  NotificationsService,
} from '@/notifications/services/notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
    };
    notificationRead: {
      upsert: jest.Mock;
      createMany: jest.Mock;
    };
  };

  const input: CreateNotificationInput = {
    type: 'BOOK_CREATED',
    title: 'Novo livro: Dom Casmurro',
    message: 'O livro "Dom Casmurro" foi adicionado ao catálogo.',
    data: { bookId: 'book-1' },
    channels: [NotificationChannel.IN_APP],
    path: '/book/book-1',
    eventKey: 'BOOK_CREATED:book-1',
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      notificationRead: {
        upsert: jest.fn(),
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('create', () => {
    it('persiste uma única notificação sem dono com o payload recebido', async () => {
      const created = { id: 'notif-1', ...input };
      prisma.notification.create.mockResolvedValue(created);

      const result = await service.create({ ...input });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { ...input },
      });
      expect(result).toEqual({ notification: created, duplicate: false });
    });

    it('retorna a existente marcada como duplicada quando a chave já existe', async () => {
      const existing = { id: 'notif-1', ...input };
      prisma.notification.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      prisma.notification.findUnique.mockResolvedValue(existing);

      const result = await service.create({ ...input });

      expect(prisma.notification.findUnique).toHaveBeenCalledWith({
        where: { eventKey: 'BOOK_CREATED:book-1' },
      });
      expect(result).toEqual({ notification: existing, duplicate: true });
    });
  });

  describe('findAll', () => {
    it('pagina e marca lida/não lida por usuário', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          title: 'A',
          reads: [{ readAt: new Date('2026-09-23T10:00:00Z') }],
        },
        { id: 'n2', title: 'B', reads: [] },
      ]);
      prisma.notification.count.mockResolvedValue(12);

      const result = await service.findAll('user-1', { page: 2, size: 10 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        include: { reads: { where: { userId: 'user-1' } } },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(result.page).toBe(2);
      expect(result.totalElements).toBe(12);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.content[0].read).toBe(true);
      expect(result.content[1].read).toBe(false);
      expect(result.content[1].readAt).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('cria a linha de leitura quando a notificação existe', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1' });
      const read = {
        notificationId: 'n1',
        userId: 'user-1',
        readAt: new Date(),
        createdAt: new Date(),
      };
      prisma.notificationRead.upsert.mockResolvedValue(read);

      const result = await service.markAsRead('n1', 'user-1');

      expect(result.notificationId).toBe('n1');
      expect(result.userId).toBe('user-1');
    });

    it('lança 404 quando a notificação não existe', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead('missing', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('retorna zero sem tocar o banco quando não há notificações', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 0 });
      expect(prisma.notificationRead.createMany).not.toHaveBeenCalled();
    });

    it('cria leituras ignorando duplicadas', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n1' },
        { id: 'n2' },
      ]);
      prisma.notificationRead.createMany.mockResolvedValue({ count: 2 });

      const result = await service.markAllAsRead('user-1');

      expect(prisma.notificationRead.createMany).toHaveBeenCalledWith({
        data: [
          { notificationId: 'n1', userId: 'user-1', readAt: expect.any(Date) },
          { notificationId: 'n2', userId: 'user-1', readAt: expect.any(Date) },
        ],
        skipDuplicates: true,
      });
      expect(result).toEqual({ count: 2 });
    });
  });

  describe('countUnread', () => {
    it('conta notificações sem leitura do usuário', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.countUnread('user-1');

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { reads: { none: { userId: 'user-1' } } },
      });
      expect(result).toEqual({ count: 3 });
    });
  });
});
