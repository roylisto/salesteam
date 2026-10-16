CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'payment_uploaded', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method_type" AS ENUM('transfer', 'qris');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."route_cycle_type" AS ENUM('1x1', '1x2', '1x3', '1x4');--> statement-breakpoint
CREATE TYPE "public"."sales_stock_status" AS ENUM('draft', 'completed');--> statement-breakpoint
CREATE TYPE "public"."sales_stock_type" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_status" AS ENUM('draft', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('scheduled', 'in_progress', 'completed', 'missed');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" varchar(150) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"legal_name" varchar(200),
	"email" varchar(150),
	"phone" varchar(30),
	"address" text,
	"logo_url" text,
	"currency" varchar(3) DEFAULT 'IDR' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Jakarta' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"role_id" bigint,
	"code" varchar(50),
	"name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"phone" varchar(30),
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_organization_owner" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "area_offices" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "area_offices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"name" varchar(150) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outlets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"warehouse_id" bigint,
	"sales_id" bigint,
	"code" varchar(80),
	"name" varchar(200),
	"outlet_type" varchar(50),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"image_url" text,
	"notes" text,
	"address" text,
	"address_detail" text,
	"latitude" double precision,
	"longitude" double precision,
	"country" varchar(100),
	"province" varchar(120),
	"city" varchar(120),
	"district" varchar(120),
	"village" varchar(120),
	"postal_code" varchar(20),
	"owner_name" varchar(150),
	"owner_address" text,
	"phone" varchar(30),
	"email" varchar(150),
	"national_id" varchar(50),
	"tax_id" varchar(50),
	"family_card_number" varchar(50),
	"business_id" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"code" varchar(80),
	"name" varchar(200) NOT NULL,
	"description" text,
	"image_url" text,
	"brand" varchar(120),
	"division" varchar(120),
	"category" varchar(120),
	"supplier" varchar(150),
	"product_type" varchar(120),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"length" integer,
	"width" integer,
	"height" integer,
	"weight" integer,
	"purchase_price" bigint,
	"retail_price" bigint,
	"wholesale_price" bigint,
	"agent_price" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_stocks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "warehouse_stocks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"warehouse_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "warehouses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"area_office_id" bigint,
	"name" varchar(150) NOT NULL,
	"depot_type" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_inventory" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sales_inventory_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"sales_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_stock_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sales_stock_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"sales_stock_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_stocks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sales_stocks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"transaction_date" date NOT NULL,
	"transaction_number" varchar(60) NOT NULL,
	"sales_id" bigint NOT NULL,
	"warehouse_id" bigint NOT NULL,
	"type" "sales_stock_type" NOT NULL,
	"status" "sales_stock_status" DEFAULT 'draft' NOT NULL,
	"input_by_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_movement_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"stock_movement_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_movements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"transaction_date" date,
	"transaction_number" varchar(60),
	"reference_number" varchar(60),
	"source_warehouse_id" bigint,
	"destination_warehouse_id" bigint,
	"type" "stock_movement_type" NOT NULL,
	"status" "stock_movement_status" DEFAULT 'draft' NOT NULL,
	"input_by_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"order_id" bigint NOT NULL,
	"transaction_number" varchar(60) NOT NULL,
	"ordered_at" timestamp with time zone NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"sales_name" varchar(150),
	"invoice_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"outstanding_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"due_date" date,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"payment_method" varchar(60),
	"payment_proof_url" text,
	"created_by_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"order_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"outlet_id" bigint NOT NULL,
	"sales_id" bigint,
	"warehouse_id" bigint,
	"transaction_number" varchar(60),
	"reference_number" varchar(60),
	"ordered_at" timestamp with time zone,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"created_by_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outlet_assignment_requests" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outlet_assignment_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"outlet_id" bigint NOT NULL,
	"route_id" bigint NOT NULL,
	"day_of_week" varchar(20) NOT NULL,
	"requested_by_id" bigint NOT NULL,
	"approved_by_id" bigint,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_assignments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "route_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"route_id" bigint NOT NULL,
	"outlet_id" bigint NOT NULL,
	"day_of_week" varchar(20) NOT NULL,
	"sequence" integer NOT NULL,
	"scheduled_date" date NOT NULL,
	"visit_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "routes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"sales_id" bigint NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date,
	"route_name" varchar(150),
	"cycle_type" "route_cycle_type" DEFAULT '1x1' NOT NULL,
	"cycle_weeks" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_stock_checks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "visit_stock_checks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"visit_id" bigint NOT NULL,
	"product_code" varchar(80) NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "visits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"sales_id" bigint NOT NULL,
	"outlet_id" bigint NOT NULL,
	"route_id" bigint,
	"order_id" bigint,
	"visit_date" date NOT NULL,
	"checkin_time" time,
	"checkin_latitude" double precision,
	"checkin_longitude" double precision,
	"checkin_distance" numeric(8, 2),
	"checkin_photo_url" text,
	"checkout_time" time,
	"checkout_latitude" double precision,
	"checkout_longitude" double precision,
	"has_transaction" boolean DEFAULT false NOT NULL,
	"visit_reason" varchar(150),
	"visit_reason_notes" text,
	"market_intelligence" text,
	"competitor_photo_url" text,
	"status" "visit_status" DEFAULT 'scheduled' NOT NULL,
	"duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_methods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"area_office_id" bigint,
	"name" varchar(150) NOT NULL,
	"type" "payment_method_type" DEFAULT 'qris' NOT NULL,
	"image_url" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"account_number" text,
	"account_name" varchar(150),
	"account_owner" varchar(150),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_tasks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "scheduled_tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint,
	"task" varchar(150) NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"output" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_offices" ADD CONSTRAINT "area_offices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_sales_id_users_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_area_office_id_area_offices_id_fk" FOREIGN KEY ("area_office_id") REFERENCES "public"."area_offices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_inventory" ADD CONSTRAINT "sales_inventory_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_inventory" ADD CONSTRAINT "sales_inventory_sales_id_users_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_inventory" ADD CONSTRAINT "sales_inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stock_items" ADD CONSTRAINT "sales_stock_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stock_items" ADD CONSTRAINT "sales_stock_items_sales_stock_id_sales_stocks_id_fk" FOREIGN KEY ("sales_stock_id") REFERENCES "public"."sales_stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stock_items" ADD CONSTRAINT "sales_stock_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD CONSTRAINT "sales_stocks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD CONSTRAINT "sales_stocks_sales_id_users_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD CONSTRAINT "sales_stocks_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_stocks" ADD CONSTRAINT "sales_stocks_input_by_id_users_id_fk" FOREIGN KEY ("input_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_items" ADD CONSTRAINT "stock_movement_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_items" ADD CONSTRAINT "stock_movement_items_stock_movement_id_stock_movements_id_fk" FOREIGN KEY ("stock_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_items" ADD CONSTRAINT "stock_movement_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_source_warehouse_id_warehouses_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_input_by_id_users_id_fk" FOREIGN KEY ("input_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_sales_id_users_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_assignment_requests" ADD CONSTRAINT "outlet_assignment_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_assignment_requests" ADD CONSTRAINT "outlet_assignment_requests_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_assignment_requests" ADD CONSTRAINT "outlet_assignment_requests_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_assignment_requests" ADD CONSTRAINT "outlet_assignment_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_assignment_requests" ADD CONSTRAINT "outlet_assignment_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_assignments" ADD CONSTRAINT "route_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_assignments" ADD CONSTRAINT "route_assignments_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_assignments" ADD CONSTRAINT "route_assignments_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_assignments" ADD CONSTRAINT "route_assignments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_sales_id_users_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_stock_checks" ADD CONSTRAINT "visit_stock_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_stock_checks" ADD CONSTRAINT "visit_stock_checks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_sales_id_users_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_area_office_id_area_offices_id_fk" FOREIGN KEY ("area_office_id") REFERENCES "public"."area_offices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_organization_slug_unique" ON "roles" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "roles_organization_idx" ON "roles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_organization_code_unique" ON "users" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "users_organization_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "area_offices_organization_idx" ON "area_offices" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_organization_code_unique" ON "outlets" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "outlets_organization_idx" ON "outlets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "outlets_warehouse_idx" ON "outlets" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "outlets_sales_idx" ON "outlets" USING btree ("sales_id");--> statement-breakpoint
CREATE INDEX "outlets_name_idx" ON "outlets" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "products_organization_code_unique" ON "products" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "products_organization_idx" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_stocks_warehouse_product_unique" ON "warehouse_stocks" USING btree ("warehouse_id","product_id");--> statement-breakpoint
CREATE INDEX "warehouse_stocks_organization_idx" ON "warehouse_stocks" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_organization_name_unique" ON "warehouses" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "warehouses_area_office_idx" ON "warehouses" USING btree ("area_office_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_inventory_sales_product_unique" ON "sales_inventory" USING btree ("sales_id","product_id");--> statement-breakpoint
CREATE INDEX "sales_inventory_organization_idx" ON "sales_inventory" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sales_stock_items_stock_idx" ON "sales_stock_items" USING btree ("sales_stock_id");--> statement-breakpoint
CREATE INDEX "sales_stock_items_organization_idx" ON "sales_stock_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sales_stocks_organization_date_idx" ON "sales_stocks" USING btree ("organization_id","transaction_date");--> statement-breakpoint
CREATE INDEX "sales_stocks_sales_idx" ON "sales_stocks" USING btree ("sales_id");--> statement-breakpoint
CREATE INDEX "sales_stocks_status_idx" ON "sales_stocks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stock_movement_items_movement_idx" ON "stock_movement_items" USING btree ("stock_movement_id");--> statement-breakpoint
CREATE INDEX "stock_movement_items_organization_idx" ON "stock_movement_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stock_movements_organization_date_idx" ON "stock_movements" USING btree ("organization_id","transaction_date");--> statement-breakpoint
CREATE INDEX "stock_movements_status_idx" ON "stock_movements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stock_movements_transaction_number_idx" ON "stock_movements" USING btree ("transaction_number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_order_unique" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "invoices_organization_status_idx" ON "invoices" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_organization_idx" ON "order_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "orders_organization_ordered_at_idx" ON "orders" USING btree ("organization_id","ordered_at");--> statement-breakpoint
CREATE INDEX "orders_outlet_idx" ON "orders" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "orders_sales_idx" ON "orders" USING btree ("sales_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_transaction_number_idx" ON "orders" USING btree ("transaction_number");--> statement-breakpoint
CREATE INDEX "outlet_assignment_requests_organization_status_idx" ON "outlet_assignment_requests" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "outlet_assignment_requests_requested_by_idx" ON "outlet_assignment_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outlet_assignment_requests_pending_unique" ON "outlet_assignment_requests" USING btree ("route_id","outlet_id","day_of_week","status");--> statement-breakpoint
CREATE INDEX "route_assignments_route_day_idx" ON "route_assignments" USING btree ("route_id","day_of_week");--> statement-breakpoint
CREATE INDEX "route_assignments_scheduled_date_idx" ON "route_assignments" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "route_assignments_organization_idx" ON "route_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "routes_organization_sales_idx" ON "routes" USING btree ("organization_id","sales_id");--> statement-breakpoint
CREATE INDEX "routes_week_start_idx" ON "routes" USING btree ("week_start_date");--> statement-breakpoint
CREATE INDEX "visit_stock_checks_visit_idx" ON "visit_stock_checks" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "visit_stock_checks_organization_idx" ON "visit_stock_checks" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visits_sales_outlet_date_unique" ON "visits" USING btree ("sales_id","outlet_id","visit_date");--> statement-breakpoint
CREATE INDEX "visits_organization_date_idx" ON "visits" USING btree ("organization_id","visit_date");--> statement-breakpoint
CREATE INDEX "visits_sales_date_idx" ON "visits" USING btree ("sales_id","visit_date");--> statement-breakpoint
CREATE INDEX "visits_outlet_date_idx" ON "visits" USING btree ("outlet_id","visit_date");--> statement-breakpoint
CREATE INDEX "visits_route_date_idx" ON "visits" USING btree ("route_id","visit_date");--> statement-breakpoint
CREATE INDEX "visits_status_idx" ON "visits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_methods_organization_idx" ON "payment_methods" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payment_methods_area_office_idx" ON "payment_methods" USING btree ("area_office_id");--> statement-breakpoint
CREATE INDEX "scheduled_tasks_task_idx" ON "scheduled_tasks" USING btree ("task");--> statement-breakpoint
CREATE INDEX "scheduled_tasks_status_idx" ON "scheduled_tasks" USING btree ("status");