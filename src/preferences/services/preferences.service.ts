import { Injectable } from '@nestjs/common';
import { PreferenceType } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { type: 'asc' },
      select: { type: true, enabled: true, updatedAt: true },
    });
  }

  async enabledUserIds(type: PreferenceType): Promise<string[]> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { type, enabled: true },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }

  async get(
    userId: string,
    type: PreferenceType = PreferenceType.APP_NOTIFICATION,
  ) {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    return preference ?? { userId, type, enabled: true };
  }

  setEnabled(
    userId: string,
    enabled: boolean,
    type: PreferenceType = PreferenceType.APP_NOTIFICATION,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      update: { enabled },
      create: { userId, type, enabled },
    });
  }
}
