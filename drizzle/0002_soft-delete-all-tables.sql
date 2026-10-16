DROP INDEX "organizations_slug_unique";--> statement-breakpoint
DROP INDEX "roles_organization_slug_unique";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "users_organization_code_unique";--> statement-breakpoint
DROP INDEX "outlets_organization_code_unique";--> statement-breakpoint
DROP INDEX "products_organization_code_unique";--> statement-breakpoint
DROP INDEX "user_area_assignments_user_area_unique";--> statement-breakpoint
DROP INDEX "warehouse_stocks_warehouse_product_unique";--> statement-breakpoint
DROP INDEX "warehouses_organization_name_unique";--> statement-breakpoint
DROP INDEX "sales_inventory_sales_product_unique";--> statement-breakpoint
DROP INDEX "invoices_order_unique";--> statement-breakpoint
DROP INDEX "outlet_assignment_requests_pending_unique";--> statement-breakpoint
DROP INDEX "visits_sales_outlet_date_unique";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "area_offices" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_area_assignments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "warehouse_stocks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_inventory" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_stock_items" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stock_movement_items" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outlet_assignment_requests" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "route_assignments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visit_stock_checks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug") WHERE "organizations"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_organization_slug_unique" ON "roles" USING btree ("organization_id","slug") WHERE "roles"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_organization_code_unique" ON "users" USING btree ("organization_id","code") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_organization_code_unique" ON "outlets" USING btree ("organization_id","code") WHERE "outlets"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "products_organization_code_unique" ON "products" USING btree ("organization_id","code") WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_area_assignments_user_area_unique" ON "user_area_assignments" USING btree ("user_id","area_office_id") WHERE "user_area_assignments"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_stocks_warehouse_product_unique" ON "warehouse_stocks" USING btree ("warehouse_id","product_id") WHERE "warehouse_stocks"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_organization_name_unique" ON "warehouses" USING btree ("organization_id","name") WHERE "warehouses"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_inventory_sales_product_unique" ON "sales_inventory" USING btree ("sales_id","product_id") WHERE "sales_inventory"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_order_unique" ON "invoices" USING btree ("order_id") WHERE "invoices"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "outlet_assignment_requests_pending_unique" ON "outlet_assignment_requests" USING btree ("route_id","outlet_id","day_of_week","status") WHERE "outlet_assignment_requests"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "visits_sales_outlet_date_unique" ON "visits" USING btree ("sales_id","outlet_id","visit_date") WHERE "visits"."deleted_at" is null;