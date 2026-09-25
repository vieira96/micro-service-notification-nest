import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { PreferencesModule } from '@/preferences/preferences.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { NotificationsController } from '@/notifications/controllers/notifications.controller';
import { NotificationsListener } from '@/notifications/consumers/notifications.listener';
import { NotificationsService } from '@/notifications/services/notifications.service';

@Module({
  imports: [AuthModule, PrismaModule, PreferencesModule, RealtimeModule],
  controllers: [NotificationsController, NotificationsListener],
  providers: [NotificationsService],
})
export class NotificationsModule {}
