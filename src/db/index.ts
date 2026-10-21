import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { migrate as migrateLite } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

// With DATABASE_URL set we talk to real Postgres; otherwise dev falls back to an
// embedded Postgres (PGlite) stored in .data/ so the app runs with zero setup.
const migrationsFolder = path.join(process.cwd(), "drizzle");

async function init() {
  if (process.env.DATABASE_URL) {
    const db = drizzlePg(process.env.DATABASE_URL, { schema });
    await migratePg(db, { migrationsFolder });
    return db;
  }
  const dir = path.join(process.cwd(), ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const db = drizzleLite({
    client: new PGlite(dir),
    schema,
  });
  await migrateLite(db, { migrationsFolder });
  return db;
}

type Db = Awaited<ReturnType<typeof init>>;
const g = globalThis as unknown as { __db?: Promise<Db> };

export function getDb(): Promise<Db> {
  return (g.__db ??= init());
}
