import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookCreatedPayload } from './book-created.payload';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createFromBookCreated(payload: BookCreatedPayload) {
    if (payload.userIds.length === 0) {
      this.logger.log('Evento sem destinatários, nada a persistir');
      return { count: 0 };
    }
    const result = await this.prisma.notification.createMany({
      data: payload.userIds.map((userId) => ({
        userId,
        type: 'BOOK_CREATED',
        title: `Novo livro: ${payload.title}`,
        message: `O livro "${payload.title}" foi adicionado ao catálogo.`,
        data: { bookId: payload.bookId },
        channel: 'IN_APP',
        status: 'SENT',
      })),
    });
    this.logger.log(
      `Notificações persistidas: count=${result.count} bookId=${payload.bookId}`,
    );
    return result;
  }

  findAll(userId?: string) {
    return this.prisma.notification.findMany({
      where: userId
        ? { OR: [{ userId: { equals: null } }, { userId }] }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Notificação ${id} não encontrada`);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  markAllAsRead(userId?: string) {
    return this.prisma.notification.updateMany({
      where: {
        status: { not: 'READ' },
        ...(userId
          ? { OR: [{ userId: { equals: null } }, { userId }] }
          : {}),
      },
      data: { status: 'READ', readAt: new Date() },
    });
  }
}
