"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncNow } from "@/app/actions";
import { exportHref } from "@/lib/export";
import { ExportLink } from "./export-link";

export function Toolbar() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const upload = (file: File) =>
    start(async () => {
      setMsg("Importing…");
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) return setMsg(json.error ?? "Import failed");
      setMsg(
        `Imported ${json.copies} cards (${json.imported} entries)` +
          (json.failed.length ? ` · ${json.failed.length} rows unmatched (first: row ${json.failed[0].row})` : ""),
      );
      router.refresh();
    });

  const sync = () =>
    start(async () => {
      setMsg("Syncing prices…");
      const r = await syncNow();
      setMsg(r.ok ? `Updated ${r.snapshots} prices for ${r.cards} cards` : r.error);
      router.refresh();
    });

  const btn =
    "rounded-md border border-sky/60 px-3 py-1.5 font-label text-[13px] font-semibold tracking-wide text-sky hover:bg-sky/10 disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-3">
      {msg && <span className="text-sm text-slate-2">{msg}</span>}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button className={btn} disabled={pending} onClick={() => fileRef.current?.click()}>
        Import CSV
      </button>
      <ExportLink href={exportHref({ scope: "portfolio" })} className={`inline-flex items-center gap-1.5 ${btn}`}>
        Export CSV
      </ExportLink>
      <button
        className="rounded-md bg-mint px-3 py-1.5 font-label text-[13px] font-bold tracking-wide text-canvas hover:brightness-110 disabled:opacity-50"
        disabled={pending}
        onClick={sync}
      >
        Sync prices
      </button>
    </div>
  );
}
