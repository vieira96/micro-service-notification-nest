import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { NotificationsModule } from '@/notifications/notifications.module';
import { PreferencesModule } from '@/preferences/preferences.module';
import { RabbitTopologyService } from '@/rabbit/rabbit-topology.service';
import { RealtimeModule } from '@/realtime/realtime.module';

@Module({
  imports: [NotificationsModule, PreferencesModule, RealtimeModule],
  controllers: [AppController],
  providers: [AppService, RabbitTopologyService],
})
export class AppModule {}
