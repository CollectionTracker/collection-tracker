"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toolbar } from "@/components/toolbar";
import { VIEWS, isActive } from "@/lib/views";

const label = "px-1 font-label text-[10px] font-bold uppercase tracking-widest";

/** `currency` is the server-rendered currency selector, shown in the controls section. */
export function HeaderDrawer({ currency }: { currency: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-controls="header-drawer"
        aria-expanded={open}
        aria-label="Toggle navigation menu"
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-surface text-ink hover:text-mint"
      >
        <span className={`h-0.5 w-5 rounded-full bg-current transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`} />
        <span className={`h-0.5 w-5 rounded-full bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`h-0.5 w-5 rounded-full bg-current transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
      </button>
      {open && (
        <div
          id="header-drawer"
          className="absolute inset-x-0 top-full z-40 space-y-5 border-t border-white/5 bg-inset page-x py-5 shadow-2xl"
        >
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`${label} text-mint`}>Views &amp; Categories</span>
              <span className="font-label text-[10px] text-slate-2">{VIEWS.length} views</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {VIEWS.map((v) => {
                const active = isActive(v.href, pathname);
                return (
                  <Link
                    key={v.href}
                    href={v.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-xl px-3.5 py-2.5 text-center text-xs font-bold ${
                      active ? "bg-mint text-canvas" : "border border-white/5 bg-surface text-slate-2 hover:text-ink"
                    }`}
                  >
                    {v.label}
                  </Link>
                );
              })}
            </div>
          </section>
          <section className="space-y-3 border-t border-white/5 pt-3">
            <span className={`${label} text-slate-2`}>Portfolio Controls &amp; Tools</span>
            <div className="flex items-center gap-2">{currency}</div>
            <Toolbar />
          </section>
        </div>
      )}
    </div>
  );
}
