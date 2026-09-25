import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CountResponseDto } from '@/common/dto/count-response.dto';
import { PageQueryDto } from '@/common/dto/page-query.dto';
import { PageResponseDto } from '@/common/dto/page-response.dto';
import { NotificationChannel, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MarkAllReadResponseDto } from '@/notifications/dto/mark-all-read-response.dto';
import { NotificationReadResponseDto } from '@/notifications/dto/notification-read-response.dto';
import { NotificationResponseDto } from '@/notifications/dto/notification-response.dto';

export interface CreateNotificationInput {
  type: string;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
  channels: NotificationChannel[];
  path?: string | null;
  url?: string | null;
  eventKey: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    try {
      const notification = await this.prisma.notification.create({
        data: { ...input },
      });
      this.logger.log(`Notificação persistida: id=${notification.id}`);
      return { notification, duplicate: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.log(
          `Evento duplicado ignorado: eventKey=${input.eventKey}`,
        );
        const existing = await this.prisma.notification.findUnique({
          where: { eventKey: input.eventKey },
        });
        if (existing) {
          return { notification: existing, duplicate: true };
        }
      }
      throw error;
    }
  }

  async findAll(
    userId: string,
    query: PageQueryDto,
  ): Promise<PageResponseDto<NotificationResponseDto>> {
    const page = query.page ?? 1;
    const size = query.size ?? 10;
    const [notifications, totalElements] = await Promise.all([
      this.prisma.notification.findMany({
        include: { reads: { where: { userId } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.notification.count(),
    ]);
    const content = notifications.map(({ reads, ...notification }) =>
      NotificationResponseDto.fromPrisma(
        notification,
        reads.length > 0 && reads[0].readAt !== null,
        reads.length > 0 ? reads[0].readAt : null,
      ),
    );
    return PageResponseDto.from(content, totalElements, page, size);
  }

  async countUnread(userId: string): Promise<CountResponseDto> {
    const count = await this.prisma.notification.count({
      where: { reads: { none: { userId } } },
    });
    return CountResponseDto.fromCount(count);
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<NotificationReadResponseDto> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Notificação ${id} não encontrada`);
    }
    const read = await this.prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId: id, userId } },
      update: { readAt: new Date() },
      create: { notificationId: id, userId, readAt: new Date() },
    });
    return NotificationReadResponseDto.fromPrisma(read);
  }

  async markAllAsRead(userId: string): Promise<MarkAllReadResponseDto> {
    const ids = await this.prisma.notification.findMany({
      select: { id: true },
    });
    if (ids.length === 0) {
      return MarkAllReadResponseDto.fromCount(0);
    }
    const result = await this.prisma.notificationRead.createMany({
      data: ids.map(({ id }) => ({
        notificationId: id,
        userId,
        readAt: new Date(),
      })),
      skipDuplicates: true,
    });
    return MarkAllReadResponseDto.fromCount(result.count);
  }
}
