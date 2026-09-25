-- Chave de idempotência: segunda entrega do mesmo evento vira no-op via UNIQUE
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "event_key" VARCHAR(120);
UPDATE "notifications"
SET "event_key" = "type" || ':' || COALESCE("data"->>'bookId', gen_random_uuid()::text)
WHERE "event_key" IS NULL;
DELETE FROM "notifications" AS newer USING "notifications" AS older
WHERE newer."event_key" = older."event_key"
  AND (newer."created_at", newer."id") > (older."created_at", older."id");
ALTER TABLE "notifications" ALTER COLUMN "event_key" SET NOT NULL;
CREATE UNIQUE INDEX "notifications_event_key_key" ON "notifications"("event_key");
