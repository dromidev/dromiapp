-- Una sola columna para torre+apartamento (ej. 38503 = 38 + 503)
ALTER TABLE "assistants" ADD COLUMN "unidad" text;
UPDATE "assistants" SET "unidad" = trim("tower") || trim("apartment") WHERE "unidad" IS NULL;
ALTER TABLE "assistants" ALTER COLUMN "unidad" SET NOT NULL;
ALTER TABLE "assistants" DROP COLUMN "tower";
ALTER TABLE "assistants" DROP COLUMN "apartment";
