ALTER TYPE "public"."stock_movement_status" ADD VALUE 'reversed';--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "reversal_of_id" bigint;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "replacement_of_id" bigint;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "correction_reason" text;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reversal_of_id_stock_movements_id_fk" FOREIGN KEY ("reversal_of_id") REFERENCES "public"."stock_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_replacement_of_id_stock_movements_id_fk" FOREIGN KEY ("replacement_of_id") REFERENCES "public"."stock_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_reversal_unique" ON "stock_movements" USING btree ("reversal_of_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_replacement_unique" ON "stock_movements" USING btree ("replacement_of_id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_one_correction_kind" CHECK ("stock_movements"."reversal_of_id" is null or "stock_movements"."replacement_of_id" is null);