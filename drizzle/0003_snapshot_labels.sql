CREATE TABLE "snapshot_labels" (
	"day" date PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
