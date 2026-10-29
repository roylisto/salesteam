ALTER TABLE "organizations" ADD COLUMN "district" varchar(120);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "village" varchar(120);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "longitude" double precision;