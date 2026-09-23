-- CreateTable
CREATE TABLE "notification_reads" (
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("notification_id", "user_id")
);

-- CreateIndex
CREATE INDEX "notification_reads_user_id_idx" ON "notification_reads"("user_id");

-- DropIndex
DROP INDEX "notifications_user_id_created_at_idx";
DROP INDEX "notifications_user_id_status_idx";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "read_at",
DROP COLUMN "status",
DROP COLUMN "user_id";

-- DropEnum
DROP TYPE "NotificationStatus";

-- CreateForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
