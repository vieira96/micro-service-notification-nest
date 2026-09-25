import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationChannel } from '@/generated/prisma/client';
import { BookCreatedPayload } from '@/notifications/dto/book-created.payload';
import { NotificationsService } from '@/notifications/services/notifications.service';

@Controller()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('book.created')
  async handleBookCreated(
    @Payload() payload: BookCreatedPayload,
  ): Promise<void> {
    this.logger.log(
      `Evento book.created recebido: bookId=${payload.bookId} title="${payload.title}"`,
    );
    await this.notificationsService.create({
      type: 'BOOK_CREATED',
      title: `Novo livro: ${payload.title}`,
      message: `O livro "${payload.title}" foi adicionado ao catálogo.`,
      channels: [NotificationChannel.IN_APP],
      path: `/book/${payload.bookId}`,
    });
  }
}
