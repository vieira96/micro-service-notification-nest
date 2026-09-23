import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const preference =
      await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });
    return preference ?? { userId, enabled: true };
  }

  setEnabled(userId: string, enabled: boolean) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: { enabled },
      create: { userId, enabled },
    });
  }
}
