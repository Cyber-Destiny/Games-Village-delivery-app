ALTER TYPE "public"."role" ADD VALUE 'vendor';--> statement-breakpoint
CREATE TABLE "shop_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid,
	"side" text NOT NULL,
	"body" text NOT NULL,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_preview" text,
	"resident_read_at" timestamp with time zone,
	"vendor_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "shop_messages" ADD CONSTRAINT "shop_messages_thread_id_shop_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."shop_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_messages" ADD CONSTRAINT "shop_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_messages" ADD CONSTRAINT "shop_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_threads" ADD CONSTRAINT "shop_threads_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_threads" ADD CONSTRAINT "shop_threads_resident_id_users_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shop_messages_thread_idx" ON "shop_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_threads_pair_idx" ON "shop_threads" USING btree ("vendor_id","resident_id");--> statement-breakpoint
CREATE INDEX "shop_threads_vendor_idx" ON "shop_threads" USING btree ("vendor_id","last_message_at");--> statement-breakpoint
CREATE INDEX "shop_threads_resident_idx" ON "shop_threads" USING btree ("resident_id","last_message_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;