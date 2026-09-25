import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
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
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      this.logger.log(
        `Evento book.created recebido: bookId=${payload.bookId} title="${payload.title}"`,
      );
      const { notification: created, duplicate } =
        await this.notificationsService.create({
          type: 'BOOK_CREATED',
          title: `Novo livro: ${payload.title}`,
          message: `O livro "${payload.title}" foi adicionado ao catálogo.`,
          channels: [NotificationChannel.IN_APP],
          path: `/book/${payload.bookId}`,
          eventKey: `BOOK_CREATED:${payload.bookId}`,
        });
      if (!duplicate) {
        const accepted = await this.preferencesService.enabledUserIds(
          PreferenceType.APP_NOTIFICATION,
        );
        this.realtimeGateway.emitToUsers(
          accepted,
          'notification:new',
          NotificationResponseDto.fromPrisma(created, false, null),
        );
      } else {
        this.logger.log(
          `Push ignorado (duplicado): bookId=${payload.bookId}`,
        );
      }
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Falha ao processar book.created: bookId=${payload?.bookId}`,
        error instanceof Error ? error.stack : String(error),
      );
      channel.nack(message, false, false);
    }
  }
}
