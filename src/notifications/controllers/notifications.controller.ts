import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PageQueryDto } from '@/common/dto/page-query.dto';
import { NotificationsService } from '@/notifications/services/notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() request: AuthenticatedRequest, @Query() query: PageQueryDto) {
    return this.notificationsService.findAll(request.user.id, query);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  countUnread(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.countUnread(request.user.id);
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
