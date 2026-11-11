ALTER TABLE "outlets" DROP CONSTRAINT "outlets_warehouse_id_warehouses_id_fk";
--> statement-breakpoint
DROP INDEX "outlets_warehouse_idx";--> statement-breakpoint
ALTER TABLE "outlets" DROP COLUMN "warehouse_id";