ALTER TABLE "landing_contact_submissions"
  ADD COLUMN IF NOT EXISTS "resend_email_id" text,
  ADD COLUMN IF NOT EXISTS "notify_error" text;
