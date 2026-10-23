CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid,
	"side" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_preview" text,
	"user_read_at" timestamp with time zone,
	"support_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_thread_id_support_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."support_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_threads" ADD CONSTRAINT "support_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_messages_thread_idx" ON "support_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "support_threads_user_idx" ON "support_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_threads_recent_idx" ON "support_threads" USING btree ("last_message_at");