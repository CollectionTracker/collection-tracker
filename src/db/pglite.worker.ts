import { PGlite } from "@electric-sql/pglite";
import { worker } from "@electric-sql/pglite/worker";

// One tab at a time owns the database (PGlite elects a leader); the others send their queries here through it, so
// two tabs never write to the same IndexedDB store at once.
worker({
  async init(options) {
    return new PGlite({ dataDir: options.dataDir });
  },
});
