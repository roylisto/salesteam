ALTER TABLE "warehouses" ADD COLUMN "pic_user_id" bigint;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "province" varchar(120);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "regency" varchar(120);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "district" varchar(120);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "village" varchar(120);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_pic_user_id_users_id_fk" FOREIGN KEY ("pic_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "warehouses_pic_user_idx" ON "warehouses" USING btree ("pic_user_id");