-- Troca o boolean external por path (navegação interna) vs url (redirect externo)
ALTER TABLE "notifications" DROP COLUMN "external";
ALTER TABLE "notifications" ADD COLUMN "path" VARCHAR(500);
