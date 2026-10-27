CREATE TABLE "user_warehouse_assignments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_warehouse_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"warehouse_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_warehouse_assignments" ADD CONSTRAINT "user_warehouse_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_warehouse_assignments" ADD CONSTRAINT "user_warehouse_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_warehouse_assignments" ADD CONSTRAINT "user_warehouse_assignments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_warehouse_assignments_user_warehouse_unique" ON "user_warehouse_assignments" USING btree ("user_id","warehouse_id") WHERE "user_warehouse_assignments"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "user_warehouse_assignments_organization_idx" ON "user_warehouse_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "user_warehouse_assignments_user_idx" ON "user_warehouse_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_warehouse_assignments_warehouse_idx" ON "user_warehouse_assignments" USING btree ("warehouse_id");