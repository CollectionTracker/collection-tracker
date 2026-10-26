"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useData } from "@/components/data-provider";
import { listSnapshots } from "@/lib/snapshots";
import { VIEWS, isActive } from "@/lib/views";

/** Snapshot date and current view/page for the footer. */
export function FooterStatus() {
  const days = useData(["snapshots"], listSnapshots).map((s) => s.day);
  const pathname = usePathname();
  const requested = useSearchParams().get("snapshot");
  const day = requested && days.includes(requested) ? requested : null;
  const index = Math.max(0, VIEWS.findIndex((v) => isActive(v.href, pathname)));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-3">
      <span>{day ? `Snapshot ${day}` : days[0] ? `Prices ${days[0]}` : "No snapshots"}</span>
      <span>•</span>
      <span className="text-mint">{VIEWS[index].label}</span>
      <span>•</span>
      <span>
        {pad(index + 1)} / {pad(VIEWS.length)}
      </span>
    </div>
  );
}
