ALTER TABLE "runner_profiles" ADD COLUMN "id_documents" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "purpose" text;