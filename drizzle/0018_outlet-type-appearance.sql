ALTER TABLE "outlet_types" ADD COLUMN "color" varchar(7) DEFAULT '#4f46e5' NOT NULL;--> statement-breakpoint
ALTER TABLE "outlet_types" ADD COLUMN "icon" varchar(32) DEFAULT 'store' NOT NULL;