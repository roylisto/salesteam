ALTER TYPE "public"."stock_movement_status" ADD VALUE 'partially_reversed';--> statement-breakpoint
DROP INDEX "stock_movements_reversal_unique";--> statement-breakpoint
CREATE INDEX "stock_movements_reversal_idx" ON "stock_movements" USING btree ("reversal_of_id");