import type { Prisma } from '../../generated/prisma/client';

export class NotificationResponseDto {
  id!: string;
  type!: string;
  title!: string;
  message!: string;
  data!: Prisma.JsonValue | null;
  channel!: string;
  read!: boolean;
  readAt!: Date | null;

  static fromPrisma(
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      data: Prisma.JsonValue | null;
      channel: string;
    },
    read: boolean,
    readAt: Date | null,
  ): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.type = notification.type;
    dto.title = notification.title;
    dto.message = notification.message;
    dto.data = notification.data;
    dto.channel = notification.channel;
    dto.read = read;
    dto.readAt = readAt;
    return dto;
  }
}
