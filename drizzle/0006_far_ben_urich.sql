CREATE TABLE "outlet_types" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outlet_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "outlet_type_id" bigint;--> statement-breakpoint
ALTER TABLE "outlet_types" ADD CONSTRAINT "outlet_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outlet_types_organization_name_unique" ON "outlet_types" USING btree ("organization_id","name") WHERE "outlet_types"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "outlet_types_organization_idx" ON "outlet_types" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_outlet_type_id_outlet_types_id_fk" FOREIGN KEY ("outlet_type_id") REFERENCES "public"."outlet_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outlets_outlet_type_idx" ON "outlets" USING btree ("outlet_type_id");