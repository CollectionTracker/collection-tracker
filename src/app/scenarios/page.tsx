import type { Metadata } from "next";
import { ClientData } from "@/components/data-provider";
import { ReorderProvider, ReorderToggle } from "@/components/reorderable-grid";
import { Scenarios } from "./scenarios";

export const metadata: Metadata = { title: "Scenarios & Growth · Collection Tracker" };

export default function Page() {
  return (
    <ReorderProvider>
      <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-5">
          <div className="min-w-0">
            <div className="font-label text-label-eyebrow uppercase text-mint">Scenarios</div>
            <h1 className="mt-1 text-headline-xl-mobile md:text-headline-xl">Scenarios &amp; Growth</h1>
          </div>
          <ReorderToggle />
        </header>
        <ClientData fallback={<p className="text-slate-2">Loading projections…</p>}>
          <Scenarios />
        </ClientData>
      </main>
    </ReorderProvider>
  );
}
