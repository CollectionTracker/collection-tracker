import type { PGlite } from "@electric-sql/pglite";
import { PGliteWorker } from "@electric-sql/pglite/worker";
import type { PgDialect, PgSession } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { migrations } from "./migrations";
import * as schema from "./schema";

// The database lives in this browser only: PGlite (Postgres in WebAssembly) persisted to IndexedDB. Nothing is stored
// on the server, so every browser has its own private collection.
// `npm run dev` gets a separate, pre-filled demo database so real data is never mixed with it. Set SEED_DEV_DATA=0 to
// use the real one; delete the "collection-tracker-demo" IndexedDB database to regenerate the demo.
const DEMO = process.env.NODE_ENV === "development" && process.env.SEED_DEV_DATA !== "0";
export const DB_NAME = DEMO ? "collection-tracker-demo" : "collection-tracker";

async function init() {
  if (typeof window === "undefined") throw new Error("The database only runs in the browser");
  const client = new PGliteWorker(new Worker(new URL("./pglite.worker.ts", import.meta.url), { type: "module" }), {
    dataDir: `idb://${DB_NAME}`,
  });
  // PGliteWorker forwards every query to the leader tab's PGlite, so drizzle can treat it as one.
  const db = drizzle({ client: client as unknown as PGlite, schema });
  // Tabs opening together would race to migrate and seed the same database; the lock runs them one after another.
  await navigator.locks.request(`${DB_NAME}-setup`, async () => {
    // What drizzle's migrate() does, with the bundled migrations instead of files read from disk.
    const { dialect, session } = db as unknown as { dialect: PgDialect; session: PgSession };
    await dialect.migrate(migrations, session, { migrationsFolder: "" });
    if (DEMO && !(await db.select().from(schema.sets).limit(1)).length) {
      const { seedDevData } = await import("./seed-dev");
      await seedDevData(db);
    }
  });
  return db;
}

type Db = Awaited<ReturnType<typeof init>>;
let db: Promise<Db> | undefined;

/** Point `getDb` at another database, e.g. an in-memory PGlite in unit tests, which run under Node, not in a browser. */
export function setDbForTests(other: Db) {
  db = Promise.resolve(other);
}

export function getDb(): Promise<Db> {
  return (db ??= init().catch((e) => {
    db = undefined; // let the next call retry
    throw e;
  }));
}
