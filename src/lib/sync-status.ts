import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { syncRuns } from "@/db/schema";

/** A successful sync older than this is shown as stale (the job is meant to run daily). */
export const STALE_AFTER_HOURS = 36;

export type SyncStatus = {
  state: "never" | "verified" | "stale" | "failed" | "running";
  lastSuccess: Date | null;
  lastError: string | null; // set when the latest run failed
};

/** Derive the header state from the latest run and the latest successful run. */
export function syncState(
  latest: { status: string; error: string | null } | undefined,
  lastSuccess: Date | null,
  now = new Date(),
): SyncStatus {
  const base = { lastSuccess, lastError: null };
  if (!latest) return { ...base, state: "never" };
  // A run that never finished (crashed process) is not "running" forever; only the newest one counts.
  if (latest.status === "failed") return { state: "failed", lastSuccess, lastError: latest.error };
  if (latest.status === "running") return { ...base, state: "running" };
  const age = lastSuccess ? now.getTime() - lastSuccess.getTime() : Infinity;
  return { ...base, state: age > STALE_AFTER_HOURS * 3_600_000 ? "stale" : "verified" };
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const db = await getDb();
  const [latest] = await db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1);
  const [ok] = await db
    .select({ at: syncRuns.finishedAt })
    .from(syncRuns)
    .where(eq(syncRuns.status, "success"))
    .orderBy(desc(syncRuns.id))
    .limit(1);
  return syncState(latest, ok?.at ?? null);
}
