"use client";

import { useState } from "react";
import { buildExport } from "@/lib/export-file";
import { downloadText } from "@/lib/download";

/** Downloads the CSV named by `href` (see `exportHref`), built in the browser from its own database. */
export function ExportLink({ href, className, children = "Export CSV" }: { href: string; className?: string; children?: string }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const { filename, csv } = await buildExport(href);
      downloadText(filename, csv, "text/csv;charset=utf-8");
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-4 py-2 font-label text-label-md text-ink hover:brightness-125 disabled:opacity-50"
      }
    >
      <svg aria-hidden className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
      {children}
    </button>
  );
}
