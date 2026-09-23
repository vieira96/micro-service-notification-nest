import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { NotificationsModule } from '@/notifications/notifications.module';
import { PreferencesModule } from '@/preferences/preferences.module';

@Module({
  imports: [NotificationsModule, PreferencesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
