CREATE TABLE "sealed_price_snapshots" (
	"sealed_product_id" integer NOT NULL,
	"day" date NOT NULL,
	"market" double precision,
	"low" double precision,
	"mid" double precision,
	"high" double precision,
	CONSTRAINT "sealed_price_snapshots_sealed_product_id_day_pk" PRIMARY KEY("sealed_product_id","day")
);
--> statement-breakpoint
CREATE TABLE "sealed_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"product_type" text NOT NULL,
	"set_group" text,
	"sku" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"purchase_price" double precision,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sealed_price_snapshots" ADD CONSTRAINT "sealed_price_snapshots_sealed_product_id_sealed_products_id_fk" FOREIGN KEY ("sealed_product_id") REFERENCES "public"."sealed_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sealed_products_type_idx" ON "sealed_products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "sealed_products_set_idx" ON "sealed_products" USING btree ("set_group");