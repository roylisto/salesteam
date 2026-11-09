ALTER TABLE "outlets" DROP CONSTRAINT "outlets_sales_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "outlets_sales_idx";--> statement-breakpoint
ALTER TABLE "outlets" DROP COLUMN "sales_id";