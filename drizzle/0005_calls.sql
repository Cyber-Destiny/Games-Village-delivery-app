CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid,
	"order_id" uuid,
	"caller_id" uuid NOT NULL,
	"caller_side" text NOT NULL,
	"status" text DEFAULT 'ringing' NOT NULL,
	"offer" text NOT NULL,
	"answer" text,
	"answered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_thread_id_shop_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."shop_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_caller_id_users_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_status_idx" ON "calls" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "calls_thread_idx" ON "calls" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "calls_order_idx" ON "calls" USING btree ("order_id");