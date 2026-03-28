ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'client';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_name" text;
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "acta_steps_completed" integer NOT NULL DEFAULT 0;
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "acta_updated_at" timestamp with time zone;
