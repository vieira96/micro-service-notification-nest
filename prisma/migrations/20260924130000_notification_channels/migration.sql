-- Altera canal único para lista de canais (uma notificação pode ir por vários canais)
ALTER TABLE "notifications" RENAME COLUMN "channel" TO "channels";
ALTER TABLE "notifications" ALTER COLUMN "channels" DROP DEFAULT;
ALTER TABLE "notifications" ALTER COLUMN "channels" TYPE "NotificationChannel"[] USING ARRAY["channels"];
ALTER TABLE "notifications" ALTER COLUMN "channels" SET DEFAULT '{IN_APP}';
ALTER TABLE "notifications" ALTER COLUMN "channels" SET NOT NULL;
