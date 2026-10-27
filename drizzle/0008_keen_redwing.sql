ALTER TABLE "users" ADD COLUMN "username" varchar(50);--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username") WHERE "users"."deleted_at" is null;