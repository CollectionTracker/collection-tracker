import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { snapshotLabels } from "@/db/schema";

export const snapshotLabelInput = z.object({
  day: z.iso.date(),
  // An empty label clears it.
  label: z.string().trim().max(80),
});

export type SnapshotLabelInput = z.input<typeof snapshotLabelInput>;

export type SnapshotSummary = {
  day: string;
  label: string | null;
  cards: number; // raw price rows stored that day
  sealed: number; // sealed price rows stored that day
};

/** Label the snapshot of a day, or clear it with an empty label. The day must have stored prices. */
export async function setSnapshotLabel(input: SnapshotLabelInput) {
  const v = snapshotLabelInput.parse(input);
  const db = await getDb();
  const exists = await db.execute<{ n: number }>(sql`
    select 1 as n from price_snapshots where day = ${v.day}
    union all select 1 from sealed_price_snapshots where day = ${v.day} limit 1`);
  if (!exists.rows.length) throw new Error(`No snapshot stored for ${v.day}`);
  if (!v.label) {
    await db.delete(snapshotLabels).where(sql`${snapshotLabels.day} = ${v.day}`);
    return { day: v.day, label: null };
  }
  await db
    .insert(snapshotLabels)
    .values({ day: v.day, label: v.label })
    .onConflictDoUpdate({ target: snapshotLabels.day, set: { label: v.label, updatedAt: new Date() } });
  return { day: v.day, label: v.label };
}

/** Every day with stored prices, newest first, with its label if it has one. */
export async function listSnapshots(): Promise<SnapshotSummary[]> {
  const db = await getDb();
  const res = await db.execute<{ day: string; label: string | null; cards: number; sealed: number }>(sql`
    select d.day::text as day, l.label, sum(d.cards)::int as cards, sum(d.sealed)::int as sealed
    from (
      select day, count(*) as cards, 0 as sealed from price_snapshots group by day
      union all
      select day, 0, count(*) from sealed_price_snapshots group by day
    ) d
    left join snapshot_labels l on l.day = d.day
    group by d.day, l.label
    order by d.day desc
  `);
  return res.rows;
}

/** The snapshot day asked for, or null (current) when it is absent or not a stored snapshot. */
export function pickSnapshot(requested: string | string[] | undefined, snapshots: SnapshotSummary[]) {
  const day = Array.isArray(requested) ? requested[0] : requested;
  return snapshots.find((s) => s.day === day)?.day ?? null;
}
