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
  // `npm run dev` gets a separate, pre-filled demo database so real data in .data/pglite is never mixed
  // with it. Set SEED_DEV_DATA=0 to use the real one; delete .data/pglite-demo to regenerate the demo.
  const demo = process.env.NODE_ENV === "development" && process.env.SEED_DEV_DATA !== "0";
  const dir = path.join(process.cwd(), demo ? ".data/pglite-demo" : ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const db = drizzleLite({
    client: new PGlite(dir),
    schema,
  });
  await migrateLite(db, { migrationsFolder });
  if (demo && !(await db.select().from(schema.sets).limit(1)).length) {
    const { seedDevData } = await import("./seed-dev");
    await seedDevData(db);
  }
  return db;
}

type Db = Awaited<ReturnType<typeof init>>;
const g = globalThis as unknown as { __db?: Promise<Db> };

export function getDb(): Promise<Db> {
  return (g.__db ??= init());
}
