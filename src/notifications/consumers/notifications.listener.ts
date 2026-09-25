import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationChannel, PreferenceType } from '@/generated/prisma/client';
import { BookCreatedPayload } from '@/notifications/dto/book-created.payload';
import { NotificationResponseDto } from '@/notifications/dto/notification-response.dto';
import { NotificationsService } from '@/notifications/services/notifications.service';
import { PreferencesService } from '@/preferences/services/preferences.service';
import { RealtimeGateway } from '@/realtime/realtime.gateway';

@Controller()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: PreferencesService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @EventPattern('book.created')
  async handleBookCreated(
    @Payload() payload: BookCreatedPayload,
  ): Promise<void> {
    this.logger.log(
      `Evento book.created recebido: bookId=${payload.bookId} title="${payload.title}"`,
    );
    const created = await this.notificationsService.create({
      type: 'BOOK_CREATED',
      title: `Novo livro: ${payload.title}`,
      message: `O livro "${payload.title}" foi adicionado ao catálogo.`,
      channels: [NotificationChannel.IN_APP],
      path: `/book/${payload.bookId}`,
    });
    const accepted = await this.preferencesService.enabledUserIds(
      PreferenceType.APP_NOTIFICATION,
    );
    this.realtimeGateway.emitToUsers(
      accepted,
      'notification:new',
      NotificationResponseDto.fromPrisma(created, false, null),
    );
  }
}
