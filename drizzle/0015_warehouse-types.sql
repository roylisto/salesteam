CREATE TABLE "warehouse_types" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "warehouse_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "warehouse_type_id" bigint;--> statement-breakpoint
ALTER TABLE "warehouse_types" ADD CONSTRAINT "warehouse_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_types_organization_name_unique" ON "warehouse_types" USING btree ("organization_id","name") WHERE "warehouse_types"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "warehouse_types_organization_idx" ON "warehouse_types" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_warehouse_type_id_warehouse_types_id_fk" FOREIGN KEY ("warehouse_type_id") REFERENCES "public"."warehouse_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "warehouses_warehouse_type_idx" ON "warehouses" USING btree ("warehouse_type_id");