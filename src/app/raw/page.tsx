import type { Metadata } from "next";
import { ClientData } from "@/components/data-provider";
import { ReorderProvider, ReorderToggle } from "@/components/reorderable-grid";
import { RawCards } from "./raw-cards";

export const metadata: Metadata = { title: "Raw Cards · Collection Tracker" };

export default function Page() {
  return (
    <ReorderProvider>
      <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-5">
          <div className="min-w-0">
            <div className="font-label text-label-eyebrow uppercase text-mint">Raw cards</div>
            <h1 className="mt-1 text-headline-xl-mobile md:text-headline-xl">Raw Cards</h1>
          </div>
          <ReorderToggle />
        </header>
        <ClientData fallback={<p className="text-slate-2">Loading collection…</p>}>
          <RawCards />
        </ClientData>
      </main>
    </ReorderProvider>
  );
}
