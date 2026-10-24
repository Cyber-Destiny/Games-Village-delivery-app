ALTER TABLE "orders" ADD COLUMN "shop_confirmed_at" timestamp with time zone;--> statement-breakpoint
-- Errands already booked don't wait for a confirmation that never got asked for.
UPDATE "orders" SET "shop_confirmed_at" = coalesce("paid_at", "created_at") WHERE "collect_as" IS NOT NULL;
