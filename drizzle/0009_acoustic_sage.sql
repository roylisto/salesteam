CREATE TYPE "public"."user_type" AS ENUM('back_office', 'sales');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_type" "user_type" DEFAULT 'back_office' NOT NULL;