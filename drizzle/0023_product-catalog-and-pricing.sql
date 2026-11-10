CREATE TABLE "brands" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brands_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"name" varchar(150) NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_units" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"name" varchar(150) NOT NULL,
	"allow_fraction" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_prices" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_prices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"sell_unit_id" bigint NOT NULL,
	"outlet_type_id" bigint NOT NULL,
	"area_id" bigint,
	"warehouse_id" bigint,
	"amount" numeric(16, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_prices_one_scope" CHECK ("product_prices"."area_id" is null or "product_prices"."warehouse_id" is null),
	CONSTRAINT "product_prices_nonnegative_amount" CHECK ("product_prices"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_sell_units" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_sell_units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"unit_id" bigint NOT NULL,
	"factor" numeric(18, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_sell_units_positive_factor" CHECK ("product_sell_units"."factor" > 0)
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand_id" bigint;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type_id" bigint;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "base_unit_id" bigint;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_types" ADD CONSTRAINT "product_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_sell_unit_id_product_sell_units_id_fk" FOREIGN KEY ("sell_unit_id") REFERENCES "public"."product_sell_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_outlet_type_id_outlet_types_id_fk" FOREIGN KEY ("outlet_type_id") REFERENCES "public"."outlet_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_area_id_area_offices_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sell_units" ADD CONSTRAINT "product_sell_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sell_units" ADD CONSTRAINT "product_sell_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sell_units" ADD CONSTRAINT "product_sell_units_unit_id_product_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."product_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_org_name_unique" ON "brands" USING btree ("organization_id","name") WHERE "brands"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "product_types_org_name_unique" ON "product_types" USING btree ("organization_id","name") WHERE "product_types"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "product_units_org_name_unique" ON "product_units" USING btree ("organization_id","name") WHERE "product_units"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "product_prices_scope_unique" ON "product_prices" USING btree ("sell_unit_id","outlet_type_id",coalesce("area_id", 0),coalesce("warehouse_id", 0)) WHERE "product_prices"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "product_prices_org_idx" ON "product_prices" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_sell_units_active_unique" ON "product_sell_units" USING btree ("product_id","unit_id") WHERE "product_sell_units"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_type_id_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_base_unit_id_product_units_id_fk" FOREIGN KEY ("base_unit_id") REFERENCES "public"."product_units"("id") ON DELETE no action ON UPDATE no action;