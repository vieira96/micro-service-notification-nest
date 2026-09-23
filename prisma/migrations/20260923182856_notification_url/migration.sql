-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "external" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "url" VARCHAR(500);
