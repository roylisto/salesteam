ALTER TABLE "warehouse_stocks" ALTER COLUMN "quantity" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "warehouse_stocks" ALTER COLUMN "quantity" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "stock_movement_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "stock_movement_items" ALTER COLUMN "quantity" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "request_key" varchar(36);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "request_hash" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_request_unique" ON "stock_movements" USING btree ("organization_id","request_key");