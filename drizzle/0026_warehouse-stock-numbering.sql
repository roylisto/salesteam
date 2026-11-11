CREATE TABLE "stock_movement_counters" (
	"organization_id" bigint NOT NULL,
	"warehouse_id" bigint NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"last_number" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "stock_movement_counters_organization_id_warehouse_id_type_pk" PRIMARY KEY("organization_id","warehouse_id","type")
);
--> statement-breakpoint
ALTER TABLE "stock_movement_counters" ADD CONSTRAINT "stock_movement_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_counters" ADD CONSTRAINT "stock_movement_counters_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_org_number_unique" ON "stock_movements" USING btree ("organization_id","transaction_number");