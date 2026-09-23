export class NotificationReadResponseDto {
  notificationId!: string;
  userId!: string;
  readAt!: Date | null;
  createdAt!: Date;

  static fromPrisma(read: {
    notificationId: string;
    userId: string;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationReadResponseDto {
    const dto = new NotificationReadResponseDto();
    dto.notificationId = read.notificationId;
    dto.userId = read.userId;
    dto.readAt = read.readAt;
    dto.createdAt = read.createdAt;
    return dto;
  }
}
