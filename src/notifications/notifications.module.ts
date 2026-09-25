import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationsController } from '@/notifications/controllers/notifications.controller';
import { NotificationsListener } from '@/notifications/consumers/notifications.listener';
import { NotificationsService } from '@/notifications/services/notifications.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationsController, NotificationsListener],
  providers: [NotificationsService],
})
export class NotificationsModule {}
