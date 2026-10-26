"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VIEWS, isActive } from "@/lib/views";

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Views"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/5 bg-inset pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {VIEWS.map((v) => {
        const active = isActive(v.href, pathname);
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 px-1 py-3 font-label text-label-sm font-bold uppercase ${
              active ? "text-mint" : "text-slate-2"
            }`}
          >
            <span className={`h-1 w-6 rounded-full ${active ? "bg-mint" : "bg-transparent"}`} />
            {v.short}
          </Link>
        );
      })}
    </nav>
  );
}
