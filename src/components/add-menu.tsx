"use client";

import { useEffect, useRef, useState } from "react";
import { AddDialog, type AddTab } from "@/components/add-dialog";
import type { DraftRow } from "@/lib/add-types";

const item = "flex w-full items-center justify-between gap-6 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-ink hover:bg-surface-2 focus-visible:bg-surface-2";

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** Header "+ Add" button: a menu to add by search or import a file, opening the add dialog. Press A anywhere to add. */
export function AddMenu() {
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AddTab>("search");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const wrap = useRef<HTMLDivElement>(null);

  const show = (t: AddTab) => {
    setTab(t);
    setMenu(false);
    setOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "a" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      setTab("search");
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => setMenu((m) => !m)}
        className="flex items-center gap-1.5 rounded-xl bg-mint px-3.5 py-2 font-label text-label-md font-bold text-canvas shadow-[0_0_18px_rgb(45_212_191/0.25)] hover:brightness-110"
      >
        <svg aria-hidden className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeWidth={2.5} />
        </svg>
        Add
        {rows.length > 0 && <span className="rounded-full bg-canvas/80 px-1.5 text-label-sm text-mint">{rows.length}</span>}
      </button>
      {menu && (
        <div role="menu" aria-label="Add" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/10 bg-surface p-1.5 shadow-2xl">
          <button role="menuitem" type="button" autoFocus onClick={() => show("search")} className={item}>
            Add card or sealed <kbd className="rounded border border-white/10 px-1.5 font-label text-label-sm text-slate-2">A</kbd>
          </button>
          <button role="menuitem" type="button" onClick={() => show("import")} className={item}>
            Import from CSV file
          </button>
          <a role="menuitem" href="/api/add/template" download onClick={() => setMenu(false)} className={`${item} font-normal text-slate-2`}>
            Download CSV template
          </a>
        </div>
      )}
      <AddDialog open={open} tab={tab} onTab={setTab} rows={rows} setRows={(f) => setRows(f)} onClose={() => setOpen(false)} />
    </div>
  );
}
