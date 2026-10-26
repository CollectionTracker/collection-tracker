"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSnapshotLabelAction } from "@/app/actions";
import type { SnapshotSummary } from "@/lib/snapshots";

function Row({ s }: { s: SnapshotSummary }) {
  const router = useRouter();
  const [label, setLabel] = useState(s.label ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await setSnapshotLabelAction({ day: s.day, label });
      if (!r.ok) return setErr(r.error);
      setErr(null);
      router.refresh();
    });

  return (
    <li className="flex flex-wrap items-center gap-3">
      <div className="w-28 text-sm tabular-nums">{s.day}</div>
      <input
        value={label}
        maxLength={80}
        placeholder="Add a label, e.g. Baseline"
        aria-label={`Label for ${s.day}`}
        disabled={pending}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => label.trim() !== (s.label ?? "") && save()}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="field min-w-0 flex-1 rounded-md px-3 py-1.5 text-sm"
      />
      <div className="text-xs text-slate-2">
        {s.cards} cards · {s.sealed} sealed
      </div>
      {err && <div className="w-full text-xs text-red-400">{err}</div>}
    </li>
  );
}

export function SnapshotList({ snapshots }: { snapshots: SnapshotSummary[] }) {
  if (!snapshots.length) return <p className="text-sm text-slate-2">No snapshots yet. Sync prices to create one.</p>;
  return (
    <ul className="space-y-3">
      {snapshots.map((s) => (
        <Row key={`${s.day}:${s.label ?? ""}`} s={s} />
      ))}
    </ul>
  );
}
