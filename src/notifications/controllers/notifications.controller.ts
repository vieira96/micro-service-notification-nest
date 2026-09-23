import {
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AuthenticatedRequest, JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PageQueryDto } from '@/common/dto/page-query.dto';
import { BookCreatedPayload } from '@/notifications/dto/book-created.payload';
import { NotificationsService } from '@/notifications/services/notifications.service';

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
  @UseGuards(JwtAuthGuard)
  findAll(@Req() request: AuthenticatedRequest, @Query() query: PageQueryDto) {
    return this.notificationsService.findAll(request.user.id, query);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(request.user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAsRead(id, request.user.id);
  }
}
