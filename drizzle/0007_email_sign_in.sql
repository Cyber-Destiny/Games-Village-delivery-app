-- Emails become sign-in identities: store them trimmed and lower-case, empty as null.
UPDATE "users" SET "email" = nullif(lower(trim("email")), '');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD COLUMN "ip" text;--> statement-breakpoint
CREATE INDEX "otp_ip_idx" ON "otp_codes" USING btree ("ip","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");