CREATE TABLE "fx_rates" (
	"day" date NOT NULL,
	"currency" text NOT NULL,
	"rate" double precision NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fx_rates_day_currency_pk" PRIMARY KEY("day","currency")
);
