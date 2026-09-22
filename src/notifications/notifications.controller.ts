import { Controller, Get, Logger, Param, Patch, Query } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BookCreatedPayload } from './book-created.payload';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('book.created')
  async handleBookCreated(
    @Payload() payload: BookCreatedPayload,
  ): Promise<void> {
    this.logger.log(
      `Evento book.created recebido: bookId=${payload.bookId} title="${payload.title}"`,
    );
    await this.notificationsService.createFromBookCreated(payload);
  }

  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.notificationsService.findAll(userId);
  }

  @Patch('read-all')
  markAllAsRead(@Query('userId') userId?: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
