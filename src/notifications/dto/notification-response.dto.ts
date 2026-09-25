export class NotificationResponseDto {
  id!: string;
  type!: string;
  title!: string;
  message!: string;
  path!: string | null;
  url!: string | null;
  createdAt!: Date;
  read!: boolean;
  readAt!: Date | null;

  static fromPrisma(
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      path: string | null;
      url: string | null;
      createdAt: Date;
    },
    read: boolean,
    readAt: Date | null,
  ): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.type = notification.type;
    dto.title = notification.title;
    dto.message = notification.message;
    dto.path = notification.path;
    dto.url = notification.url;
    dto.createdAt = notification.createdAt;
    dto.read = read;
    dto.readAt = readAt;
    return dto;
  }
}
