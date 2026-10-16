CREATE TABLE "user_area_assignments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_area_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"area_office_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reports_to" bigint;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_area_assignments" ADD CONSTRAINT "user_area_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_area_assignments" ADD CONSTRAINT "user_area_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_area_assignments" ADD CONSTRAINT "user_area_assignments_area_office_id_area_offices_id_fk" FOREIGN KEY ("area_office_id") REFERENCES "public"."area_offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_area_assignments_user_area_unique" ON "user_area_assignments" USING btree ("user_id","area_office_id");--> statement-breakpoint
CREATE INDEX "user_area_assignments_organization_idx" ON "user_area_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "user_area_assignments_user_idx" ON "user_area_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_area_assignments_area_idx" ON "user_area_assignments" USING btree ("area_office_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_reports_to_users_id_fk" FOREIGN KEY ("reports_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_reports_to_idx" ON "users" USING btree ("reports_to");--> statement-breakpoint
UPDATE "users" SET "is_admin" = true WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "slug" = 'admin');--> statement-breakpoint
UPDATE "users" SET "role_id" = NULL WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "slug" IN ('manager', 'sales', 'finance', 'admin'));--> statement-breakpoint
DELETE FROM "roles" WHERE "slug" IN ('manager', 'sales', 'finance', 'admin');--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "is_system";