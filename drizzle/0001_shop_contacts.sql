ALTER TABLE "orders" ADD COLUMN "collect_as" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "contacts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "vendors" SET "contacts" = jsonb_build_array(jsonb_build_object('label', NULL, 'phone', "phone")) WHERE coalesce("phone", '') <> '';
