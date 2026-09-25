-- CreateEnum
CREATE TYPE "PreferenceType" AS ENUM ('APP_NOTIFICATION', 'MAIL_NOTIFICATION', 'WHATSAPP_NOTIFICATION');

-- AlterTable: uma linha por (usuário, tipo); existentes viram APP_NOTIFICATION
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_pkey";
ALTER TABLE "notification_preferences" ADD COLUMN "type" "PreferenceType" NOT NULL DEFAULT 'APP_NOTIFICATION';
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id", "type");
