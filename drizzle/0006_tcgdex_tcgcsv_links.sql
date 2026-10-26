ALTER TABLE "cards" ADD COLUMN "tcgdex_id" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "tcgplayer_product_id" integer;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "tcgplayer_group_id" integer;--> statement-breakpoint
ALTER TABLE "sealed_products" ADD COLUMN "tcgplayer_product_id" integer;--> statement-breakpoint
ALTER TABLE "sealed_products" ADD COLUMN "tcgplayer_group_id" integer;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "tcgdex_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "cards_tcgdex_idx" ON "cards" USING btree ("tcgdex_id");