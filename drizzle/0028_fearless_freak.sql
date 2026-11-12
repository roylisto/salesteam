CREATE TABLE "sales_stock_counters" (
	"organization_id" bigint NOT NULL,
	"sales_id" bigint NOT NULL,
	"type" "sales_stock_type" NOT NULL,
	"last_number" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sales_stock_counters_organization_id_sales_id_type_pk" PRIMARY KEY("organization_id","sales_id","type")
);
--> statement-breakpoint
DROP INDEX "sales_inventory_sales_product_unique";--> statement-breakpoint
ALTER TABLE "sales_inventory" ALTER COLUMN "quantity" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "sales_inventory" ALTER COLUMN "quantity" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "sales_stock_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "sales_inventory" ADD COLUMN "warehouse_id" bigint;--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD COLUMN "reference_number" varchar(60);--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD COLUMN "request_key" varchar(36);--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD COLUMN "request_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD COLUMN "warehouse_movement_id" bigint;--> statement-breakpoint
ALTER TABLE "sales_stock_counters" ADD CONSTRAINT "sales_stock_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stock_counters" ADD CONSTRAINT "sales_stock_counters_sales_id_users_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_inventory" ADD CONSTRAINT "sales_inventory_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD CONSTRAINT "sales_stocks_warehouse_movement_id_stock_movements_id_fk" FOREIGN KEY ("warehouse_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_inventory_sales_product_origin_unique" ON "sales_inventory" USING btree ("sales_id","product_id",coalesce("warehouse_id", 0)) WHERE "sales_inventory"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_stocks_request_unique" ON "sales_stocks" USING btree ("organization_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_stocks_org_number_unique" ON "sales_stocks" USING btree ("organization_id","transaction_number");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_stocks_warehouse_movement_unique" ON "sales_stocks" USING btree ("warehouse_movement_id");