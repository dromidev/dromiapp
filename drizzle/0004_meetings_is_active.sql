ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
