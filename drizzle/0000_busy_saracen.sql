CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"set_id" text NOT NULL,
	"number" text NOT NULL,
	"rarity" text,
	"supertype" text,
	"image_small" text,
	"image_large" text
);
--> statement-breakpoint
CREATE TABLE "collection_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"variant" text DEFAULT 'normal' NOT NULL,
	"condition" text DEFAULT 'NM' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"purchase_price" double precision,
	"acquired_at" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"card_id" text NOT NULL,
	"variant" text NOT NULL,
	"day" date NOT NULL,
	"market" double precision,
	"low" double precision,
	"mid" double precision,
	"high" double precision,
	CONSTRAINT "price_snapshots_card_id_variant_day_pk" PRIMARY KEY("card_id","variant","day")
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"series" text NOT NULL,
	"total" integer NOT NULL,
	"printed_total" integer NOT NULL,
	"release_date" text,
	"logo" text
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_set_idx" ON "cards" USING btree ("set_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_unique" ON "collection_entries" USING btree ("card_id","variant","condition");