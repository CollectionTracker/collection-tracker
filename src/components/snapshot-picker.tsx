"use client";

import { useRouter } from "next/navigation";
import type { SnapshotSummary } from "@/lib/snapshots";

export const snapshotName = (s: SnapshotSummary) => (s.label ? `${s.label} (${s.day})` : s.day);

export function SnapshotPicker({ snapshots, selected }: { snapshots: SnapshotSummary[]; selected: string | null }) {
  const router = useRouter();
  return (
    <select
      aria-label="Snapshot"
      value={selected ?? ""}
      onChange={(e) => router.push(e.target.value ? `/?snapshot=${e.target.value}` : "/")}
      className="rounded-md border border-white/10 bg-track px-3 py-1.5 text-sm"
    >
      <option value="">Current</option>
      {snapshots.map((s) => (
        <option key={s.day} value={s.day}>
          {snapshotName(s)}
        </option>
      ))}
    </select>
  );
}
