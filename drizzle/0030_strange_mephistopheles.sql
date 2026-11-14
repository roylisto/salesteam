CREATE TABLE "order_counters" (
	"organization_id" bigint NOT NULL,
	"kind" varchar(10) NOT NULL,
	"last_number" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "order_counters_organization_id_kind_pk" PRIMARY KEY("organization_id","kind")
);
--> statement-breakpoint
CREATE TABLE "order_payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"order_id" bigint NOT NULL,
	"invoice_id" bigint NOT NULL,
	"transaction_number" varchar(60) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"method" varchar(60) NOT NULL,
	"reference" varchar(150),
	"request_key" varchar(36) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"created_by_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_stock_allocations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_stock_allocations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"order_id" bigint NOT NULL,
	"sales_inventory_id" bigint NOT NULL,
	"quantity" numeric(20, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "printer_settings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "printer_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"paper" varchar(10) DEFAULT '80' NOT NULL,
	"width" integer DEFAULT 80 NOT NULL,
	"margin" integer DEFAULT 3 NOT NULL,
	"font_size" integer DEFAULT 11 NOT NULL,
	"template" varchar(15) DEFAULT 'compact' NOT NULL,
	"header" varchar(200) DEFAULT '' NOT NULL,
	"footer" text DEFAULT 'Terima kasih atas kepercayaan Anda.' NOT NULL,
	"show_logo" boolean DEFAULT true NOT NULL,
	"show_sku" boolean DEFAULT true NOT NULL,
	"show_address" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "quantity" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "sales_inventory" ADD COLUMN "reserved_quantity" numeric(20, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sell_unit_id" bigint;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_name" varchar(200);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_code" varchar(80);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_name" varchar(150);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "base_unit_name" varchar(150);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "conversion_factor" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "base_quantity" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quotation_number" varchar(60);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "request_key" varchar(36);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "request_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfilled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "order_counters" ADD CONSTRAINT "order_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stock_allocations" ADD CONSTRAINT "order_stock_allocations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stock_allocations" ADD CONSTRAINT "order_stock_allocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stock_allocations" ADD CONSTRAINT "order_stock_allocations_sales_inventory_id_sales_inventory_id_fk" FOREIGN KEY ("sales_inventory_id") REFERENCES "public"."sales_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printer_settings" ADD CONSTRAINT "printer_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_payment_request_unique" ON "order_payments" USING btree ("organization_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "order_payment_number_unique" ON "order_payments" USING btree ("organization_id","transaction_number");--> statement-breakpoint
CREATE INDEX "order_payment_order_idx" ON "order_payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_stock_allocation_unique" ON "order_stock_allocations" USING btree ("order_id","sales_inventory_id");--> statement-breakpoint
CREATE INDEX "order_allocation_org_idx" ON "order_stock_allocations" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "printer_settings_org_unique" ON "printer_settings" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sell_unit_id_product_sell_units_id_fk" FOREIGN KEY ("sell_unit_id") REFERENCES "public"."product_sell_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_org_number_unique" ON "invoices" USING btree ("organization_id","transaction_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_org_number_unique" ON "orders" USING btree ("organization_id","transaction_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_org_request_unique" ON "orders" USING btree ("organization_id","request_key");