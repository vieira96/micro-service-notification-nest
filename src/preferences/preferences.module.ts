import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PreferencesController } from '@/preferences/controllers/preferences.controller';
import { PreferencesService } from '@/preferences/services/preferences.service';

@Module({
  imports: [PrismaModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
