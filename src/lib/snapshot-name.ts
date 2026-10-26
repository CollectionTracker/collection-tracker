import type { SnapshotSummary } from "@/lib/snapshots";

// Kept out of the "use client" picker so server components can call it too.
export const snapshotName = (s: SnapshotSummary) => (s.label ? `${s.label} (${s.day})` : s.day);
