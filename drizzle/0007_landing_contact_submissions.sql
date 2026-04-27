CREATE TABLE IF NOT EXISTS "landing_contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"whatsapp" text,
	"building_name" text,
	"coowners_count" text,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
