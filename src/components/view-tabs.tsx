"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VIEWS } from "@/lib/views";

export function ViewTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Views"
      className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/5 bg-canvas p-1 font-label text-xs font-bold uppercase tracking-wider"
    >
      {VIEWS.map((v) => {
        const active = v.href === "/" ? pathname === "/" : pathname.startsWith(v.href);
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 transition-colors ${
              active ? "bg-mint text-canvas" : "text-slate-2 hover:text-ink"
            }`}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
