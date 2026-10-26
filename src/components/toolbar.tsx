"use client";

import { useRef, useState, useTransition } from "react";
import { useRefresh } from "@/components/data-provider";
import { exportHref } from "@/lib/export";
import { importCsv } from "@/lib/import";
import { syncPricesWhenFree } from "@/lib/sync";
import { ExportLink } from "./export-link";

export function Toolbar() {
  const refresh = useRefresh();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const upload = (file: File) =>
    start(async () => {
      setMsg("Importing…");
      let json;
      try {
        json = await importCsv(await file.text());
      } catch (e) {
        return setMsg(e instanceof Error ? e.message : "Import failed");
      }
      setMsg(
        `Imported ${json.copies} cards (${json.imported} entries)` +
          (json.failed.length ? ` · ${json.failed.length} rows unmatched (first: row ${json.failed[0].row})` : ""),
      );
      refresh();
    });

  const sync = () =>
    start(async () => {
      setMsg("Syncing prices…");
      try {
        const r = await syncPricesWhenFree();
        setMsg(`Updated ${r.snapshots} prices for ${r.cards} cards`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : String(e));
      }
      refresh();
    });

  const btn =
    "rounded-md border border-sky/60 px-3 py-1.5 font-label text-label-md text-sky hover:bg-sky/10 disabled:opacity-50";
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
        className="rounded-md bg-mint px-3 py-1.5 font-label text-label-md font-bold text-canvas hover:brightness-110 disabled:opacity-50"
        disabled={pending}
        onClick={sync}
      >
        Sync prices
      </button>
    </div>
  );
}
